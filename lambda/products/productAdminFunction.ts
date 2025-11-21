import { HttpMethod } from "aws-cdk-lib/aws-lambda";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export async function handler(event: APIGatewayProxyEvent,context: Context) : Promise<APIGatewayProxyResult> {
    const lambdaRequestId = context.awsRequestId;
    const apiRequestId = event.requestContext.requestId;

    console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`);
    
    const method = event.httpMethod;
    if(event.resource === "/products"){
        if(method === "POST"){
            console.log(method);
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "POST Products - OK"
                })
            };
        }
    }
    else if(event.resource === "/products/{id}"){
        const productId = event.pathParameters!.id as string;
        if(method === HttpMethod.PUT){
            console.log(`${method} /products/${productId}`);
            return {
                statusCode: 200,
                body: `${method} /products/${productId}`
            }
        }
        else if(method === HttpMethod.DELETE){
            console.log(`${method} /products/${productId}`);
            return {
                statusCode: 200,
                body: `${method} /products/${productId}`
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