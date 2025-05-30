// ============================================================================
// SERVERLESS TODO API - ALL LAMBDA FUNCTIONS
// Complete CRUD operations for Todo items using AWS Lambda and DynamoDB
// ============================================================================

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TODO_TABLE_NAME || 'serverless-todo-api-todos-prod';

// Common headers for CORS
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// ============================================================================
// 1. CREATE TODO FUNCTION
// POST /todos
// ============================================================================

exports.createTodo = async (event) => {
    console.log('Create Todo Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }
        
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Request body is required'
                })
            };
        }

        const requestBody = JSON.parse(event.body);
        
        // Validate required fields
        if (!requestBody.title || requestBody.title.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Title is required and cannot be empty'
                })
            };
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high'];
        if (requestBody.priority && !validPriorities.includes(requestBody.priority)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Priority must be one of: low, medium, high'
                })
            };
        }

        // Validate due date format if provided
        if (requestBody.dueDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(requestBody.dueDate)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Due date must be in YYYY-MM-DD format'
                    })
                };
            }
        }
        
        // Create todo item
        const todoItem = {
            id: uuidv4(),
            title: requestBody.title.trim(),
            description: requestBody.description ? requestBody.description.trim() : '',
            status: 'pending',
            priority: requestBody.priority || 'medium',
            dueDate: requestBody.dueDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: todoItem,
            ConditionExpression: 'attribute_not_exists(id)' // Prevent overwrites
        };
        
        await dynamoDb.put(params).promise();
        
        console.log('Todo created successfully:', todoItem.id);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(todoItem)
        };
        
    } catch (error) {
        console.error('Error creating todo:', error);
        
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    error: 'Todo with this ID already exists'
                })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// ============================================================================
// 2. GET TODOS FUNCTION
// GET /todos - Get all todos
// GET /todos/{id} - Get specific todo
// ============================================================================

exports.getTodos = async (event) => {
    console.log('Get Todos Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const { id } = event.pathParameters || {};
        
        // Get specific todo by ID
        if (id) {
            const params = {
                TableName: TABLE_NAME,
                Key: { id }
            };
            
            const result = await dynamoDb.get(params).promise();
            
            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        error: 'Todo not found'
                    })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Item)
            };
        }
        
        // Get all todos with optional filtering
        const { status, priority, limit = '50', lastEvaluatedKey } = event.queryStringParameters || {};
        
        let params = {
            TableName: TABLE_NAME,
            Limit: parseInt(limit)
        };
        
        // Add pagination
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
        }
        
        let result;
        
        // Filter by status using GSI
        if (status) {
            params.IndexName = 'status-createdAt-index';
            params.KeyConditionExpression = '#status = :status';
            params.ExpressionAttributeNames = {
                '#status': 'status'
            };
            params.ExpressionAttributeValues = {
                ':status': status
            };
            params.ScanIndexForward = false; // Latest first
            
            result = await dynamoDb.query(params).promise();
        }
        // Filter by priority using GSI
        else if (priority) {
            params.IndexName = 'priority-dueDate-index';
            params.KeyConditionExpression = '#priority = :priority';
            params.ExpressionAttributeNames = {
                '#priority': 'priority'
            };
            params.ExpressionAttributeValues = {
                ':priority': priority
            };
            params.ScanIndexForward = false; // Latest first
            
            result = await dynamoDb.query(params).promise();
        }
        // Get all todos
        else {
            result = await dynamoDb.scan(params).promise();
            
            // Sort by creation date (latest first)
            result.Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        const response = {
            todos: result.Items,
            count: result.Items.length
        };
        
        // Add pagination info
        if (result.LastEvaluatedKey) {
            response.lastEvaluatedKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
        }
        
        console.log(`Retrieved ${result.Items.length} todos`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        console.error('Error retrieving todos:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// ============================================================================
// 3. UPDATE TODO FUNCTION
// PUT /todos/{id}
// ============================================================================

exports.updateTodo = async (event) => {
    console.log('Update Todo Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const { id } = event.pathParameters || {};
        
        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Todo ID is required'
                })
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Request body is required'
                })
            };
        }

        const updates = JSON.parse(event.body);
        
        // Validate allowed fields
        const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
        const updateFields = Object.keys(updates);
        const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
        
        if (invalidFields.length > 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`
                })
            };
        }

        // Validate field values
        if (updates.title !== undefined && (!updates.title || updates.title.trim() === '')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Title cannot be empty'
                })
            };
        }

        if (updates.status && !['pending', 'completed', 'archived'].includes(updates.status)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Status must be one of: pending, completed, archived'
                })
            };
        }

        if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Priority must be one of: low, medium, high'
                })
            };
        }

        if (updates.dueDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(updates.dueDate)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Due date must be in YYYY-MM-DD format'
                    })
                };
            }
        }

        // Build update expression
        let updateExpression = 'SET updatedAt = :updatedAt';
        let expressionAttributeValues = {
            ':updatedAt': new Date().toISOString()
        };
        let expressionAttributeNames = {};

        Object.keys(updates).forEach(key => {
            updateExpression += `, #${key} = :${key}`;
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = updates[key];
        });

        const params = {
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(id)', // Ensure todo exists
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamoDb.update(params).promise();
        
        console.log('Todo updated successfully:', id);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.Attributes)
        };
        
    } catch (error) {
        console.error('Error updating todo:', error);
        
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Todo not found'
                })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// ============================================================================
// 4. DELETE TODO FUNCTION
// DELETE /todos/{id}
// ============================================================================

exports.deleteTodo = async (event) => {
    console.log('Delete Todo Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const { id } = event.pathParameters || {};
        
        if (!id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Todo ID is required'
                })
            };
        }

        // First check if todo exists
        const getParams = {
            TableName: TABLE_NAME,
            Key: { id }
        };

        const existingTodo = await dynamoDb.get(getParams).promise();

        if (!existingTodo.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Todo not found'
                })
            };
        }

        // Delete the todo
        const deleteParams = {
            TableName: TABLE_NAME,
            Key: { id },
            ConditionExpression: 'attribute_exists(id)',
            ReturnValues: 'ALL_OLD'
        };

        const result = await dynamoDb.delete(deleteParams).promise();
        
        console.log('Todo deleted successfully:', id);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Todo deleted successfully',
                deletedTodo: result.Attributes
            })
        };
        
    } catch (error) {
        console.error('Error deleting todo:', error);
        
        if (error.code === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Todo not found'
                })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// ============================================================================
// 5. HEALTH CHECK FUNCTION
// GET /health
// ============================================================================

exports.healthCheck = async (event) => {
    console.log('Health Check Event:', JSON.stringify(event, null, 2));
    
    try {
        // Test DynamoDB connection
        const params = {
            TableName: TABLE_NAME,
            Limit: 1
        };

        await dynamoDb.scan(params).promise();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'Serverless Todo API',
                version: '1.0.0',
                database: 'connected'
            })
        };
        
    } catch (error) {
        console.error('Health check failed:', error);
        
        return {
            statusCode: 503,
            headers,
            body: JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                service: 'Serverless Todo API',
                version: '1.0.0',
                database: 'disconnected',
                error: error.message
            })
        };
    }
};

// ============================================================================
// 6. BULK OPERATIONS FUNCTION (BONUS)
// POST /todos/bulk - Create multiple todos
// DELETE /todos/bulk - Delete multiple todos
// ============================================================================

exports.bulkOperations = async (event) => {
    console.log('Bulk Operations Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Request body is required'
                })
            };
        }

        const requestBody = JSON.parse(event.body);
        
        if (event.httpMethod === 'POST') {
            // Bulk create todos
            const { todos } = requestBody;
            
            if (!Array.isArray(todos) || todos.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'todos array is required and cannot be empty'
                    })
                };
            }

            if (todos.length > 25) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Maximum 25 todos can be created at once'
                    })
                };
            }

            const createdTodos = [];
            const errors = [];

            // Process each todo
            for (let i = 0; i < todos.length; i++) {
                try {
                    const todo = todos[i];
                    
                    if (!todo.title || todo.title.trim() === '') {
                        errors.push({ index: i, error: 'Title is required' });
                        continue;
                    }

                    const todoItem = {
                        id: uuidv4(),
                        title: todo.title.trim(),
                        description: todo.description ? todo.description.trim() : '',
                        status: 'pending',
                        priority: todo.priority || 'medium',
                        dueDate: todo.dueDate || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    const params = {
                        TableName: TABLE_NAME,
                        Item: todoItem
                    };

                    await dynamoDb.put(params).promise();
                    createdTodos.push(todoItem);

                } catch (error) {
                    errors.push({ index: i, error: error.message });
                }
            }

            return {
                statusCode: errors.length > 0 ? 207 : 201, // 207 Multi-Status
                headers,
                body: JSON.stringify({
                    created: createdTodos,
                    errors: errors,
                    summary: {
                        total: todos.length,
                        created: createdTodos.length,
                        failed: errors.length
                    }
                })
            };
        }
        
        else if (event.httpMethod === 'DELETE') {
            // Bulk delete todos
            const { ids } = requestBody;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'ids array is required and cannot be empty'
                    })
                };
            }

            if (ids.length > 25) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Maximum 25 todos can be deleted at once'
                    })
                };
            }

            const deletedTodos = [];
            const errors = [];

            // Process each ID
            for (let i = 0; i < ids.length; i++) {
                try {
                    const id = ids[i];
                    
                    const params = {
                        TableName: TABLE_NAME,
                        Key: { id },
                        ReturnValues: 'ALL_OLD'
                    };

                    const result = await dynamoDb.delete(params).promise();
                    
                    if (result.Attributes) {
                        deletedTodos.push(result.Attributes);
                    } else {
                        errors.push({ id, error: 'Todo not found' });
                    }

                } catch (error) {
                    errors.push({ id: ids[i], error: error.message });
                }
            }

            return {
                statusCode: errors.length > 0 ? 207 : 200, // 207 Multi-Status
                headers,
                body: JSON.stringify({
                    deleted: deletedTodos,
                    errors: errors,
                    summary: {
                        total: ids.length,
                        deleted: deletedTodos.length,
                        failed: errors.length
                    }
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Method not allowed'
            })
        };
        
    } catch (error) {
        console.error('Error in bulk operations:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
