
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
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
        const requestBody = JSON.parse(event.body);
        
        // Validate required fields
        if (!requestBody.title) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required field: title'
                })
            };
        }
        
        // Create todo item
        const todoItem = {
            id: uuidv4(),
            title: requestBody.title,
            description: requestBody.description || '',
            status: 'pending',
            priority: requestBody.priority || 'medium',
            dueDate: requestBody.dueDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to DynamoDB
        const params = {
            TableName: process.env.TODO_TABLE_NAME,
            Item: todoItem
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
