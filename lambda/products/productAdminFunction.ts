import { HttpMethod } from "aws-cdk-lib/aws-lambda";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "./layers/productsLayer/nodejs/productRepository";
import { DynamoDB, Lambda } from "aws-sdk";
import * as xray from "aws-xray-sdk";
import { ProductEvent, ProductEventType } from "./layers/productEventsLayer/nodejs/productEvent";

xray.captureAWS(require("aws-sdk"));

const productsDdb = process.env.PRODUCTS_DDB!;
const productEventsFunctionName = process.env.PRODUCTS_EVENTS_FUNCTION_NAME!;

const ddbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(ddbClient, productsDdb);
const lambdaClient = new Lambda();

export async function handler(event: APIGatewayProxyEvent,context: Context) : Promise<APIGatewayProxyResult> {
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`);
    
    const method = event.httpMethod;
    if(event.resource === "/products"){
        if(method === "POST"){
            console.log(method);

            const product = JSON.parse(event.body!) as Product;
            const productCreated = await productRepository.create(product);
            const response = await sendProductEvent(product,ProductEventType.CREATED,"bruno@teste.com", lambdaRequestId);
            console.log(response);
            return {
                statusCode: 201,
                body: JSON.stringify(productCreated)
            };
        }
    }
    else if(event.resource === "/products/{id}"){
        const productId = event.pathParameters!.id as string;
        if(method === HttpMethod.PUT){
            console.log(`${method} /products/${productId}`);
            try {
                const product = JSON.parse(event.body!) as Product;
                const productUpdated = await productRepository.updateProduct(productId,product);
                const response = await sendProductEvent(productUpdated,ProductEventType.UPDATED,"bruno@teste.com", lambdaRequestId);
                console.log(response);
                return {
                    statusCode: 200,
                    body: JSON.stringify(productUpdated)
                }
            } catch (ConditionalCheckFailedException) {
                return {
                    statusCode: 404,
                    body: "Product not found"
                }
                
            }
        }
        else if(method === HttpMethod.DELETE){
            console.log(`${method} /products/${productId}`);
            try{
                const product = await productRepository.deleteProduct(productId);
                const response = await sendProductEvent(product,ProductEventType.DELETED,"bruno@teste.com", lambdaRequestId);
            console.log(response);
                return {
                    statusCode: 200,
                    body: JSON.stringify(product)
                }
            }
            catch(error){
                console.error((<Error> error).message);
                return {
                    statusCode: 404,
                    body: (<Error> error).message
                }
            }
            
        }
    }
    return {
        statusCode:400,
        body: JSON.stringify({
            message: "Bad request"
        })
    };
}

function sendProductEvent(product: Product, eventType: ProductEventType, email: string, lambdaRequestId: string){
    const event: ProductEvent = {
        email: email,
        eventType: eventType,
        productCode: product.code,
        productId: product.id,
        productPrice: product.price,
        requestId: lambdaRequestId
    };

    return lambdaClient.invoke({
        FunctionName: productEventsFunctionName,
        Payload: JSON.stringify(event),
        InvocationType: "Event"
    }).promise();
}