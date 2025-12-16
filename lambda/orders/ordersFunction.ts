import {DynamoDB, SNS} from 'aws-sdk';
import { Order, OrderRepository } from './layers/ordersLayer/nodejs/orderRepository';
import { Product, ProductRepository } from 'lambda/products/layers/productsLayer/nodejs/productRepository';
import * as AWSXray from 'aws-xray-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from './layers/ordersApiLayer/nodejs/orderApi';
import { OrderEvent, OrderEventType, Envelope} from './layers/orderEventsLayer/nodejs/orderEvent';

AWSXray.captureAWS(require('aws-sdk'));

const ordersDdb = process.env.ORDERS_DDB!;
const productsDdb = process.env.PRODUCTS_DDB!;
const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN!;

const ddbClient = new DynamoDB.DocumentClient();
const snsClient = new SNS();

const orderRepository = new OrderRepository(ddbClient, ordersDdb);
const productRepository = new ProductRepository(ddbClient, productsDdb);

export async function handler(event:APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult>{
    const method = event.httpMethod;
    const apiRequestId = event.requestContext.requestId;
    const lambdaRequestId = context.awsRequestId;

    console.log(`API Gateway RequestId: ${apiRequestId} - LambdaRequestId : ${lambdaRequestId}`);

    console.log(`${method} /orders`);
    if(method === HttpMethod.GET){
        if(event.queryStringParameters){
            const email = event.queryStringParameters!.email;
            const orderId = event.queryStringParameters!.orderId;
            if(email){
                if(orderId){
                    //get one order
                    const order = await orderRepository.getOrder(email, orderId);
                    try {
                        return {
                            statusCode: 200,
                            body: JSON.stringify(convertToOrderResponse(order))
                        }
                    } catch (error) {
                        console.error((<Error>error).message)
                        return {
                            statusCode: 500,
                            body: (<Error>error).message
                        }
                    }
                }
                else{
                    //get all orders from an user
                    console.log(`get all orders from an user(${email})`);
                    const orders = await orderRepository.getOrdersByEmail(email);
                    return {
                        statusCode: 200,
                        body: JSON.stringify(orders.map(convertToOrderResponse))
                    }
                }
            }
        }
        else{
            //get all orders
            const orders = await orderRepository.getAllOrders();
            console.log(orders);
            if(orders){
                return {
                    statusCode: 200,
                    body: JSON.stringify(orders.map(convertToOrderResponse))
                }
            }
            return {
                    statusCode: 200,
                    body: JSON.stringify([])
                }
        }
    }
    else if(method == HttpMethod.POST){
        const orderRequest = JSON.parse(event.body!) as OrderRequest;
        console.log(`Order request: ${JSON.stringify(orderRequest)}`);
        const products = await productRepository.getProductsByIds(orderRequest.productIds);
        console.log(`Products: ${JSON.stringify(products)}`);
        if(products.length === orderRequest.productIds.length){
            const order = buildOrder(orderRequest, products);
            console.log(`Order: ${JSON.stringify(order)}`);
            const orderCreated = await orderRepository.createOrder(order);

            const eventResult = await sendOrderEvent(orderCreated, OrderEventType.CREATED, lambdaRequestId);
            console.log(`Order create event sent - orderId: ${orderCreated.sk} - MessageId: ${eventResult.MessageId}`);

            return {
                statusCode: 201,
                body: JSON.stringify(convertToOrderResponse(orderCreated))
            }
        }
        else{
            return { 
                statusCode: 404,
                body: "At least one product could not be found."
            }
        }

    }
    else if( method == HttpMethod.DELETE){
        const email = event.queryStringParameters!.email!;
        const orderId = event.queryStringParameters!.orderId!;
        try {
            const orderDeleted = await orderRepository.deleteOrder(email, orderId);

            const eventResult = await sendOrderEvent(orderDeleted, OrderEventType.DELETED, lambdaRequestId);
            console.log(`Order deleted event sent - orderId: ${orderDeleted.sk} - MessageId: ${eventResult.MessageId}`);

            return {
                statusCode: 200,
                body: JSON.stringify(convertToOrderResponse(orderDeleted))
            }
        } catch (error) {
            console.error((<Error>error).message);
            return { 
                statusCode: 404,
                body: (<Error>error).message
            }
        }
    }

    return {
        statusCode: 400,
        body: "Bad request"
    };
}

function buildOrder(orderRequest: OrderRequest, products: Product[]) : Order {
    const orderProducts: OrderProductResponse[] = [];
    let totalPrice = 0;

    products.forEach((product) =>{
        totalPrice += product.price;
        orderProducts.push({
            code: product.code,
            price: product.price
        });
    });

    const order: Order = {
        pk: orderRequest.email,
        billing : {
            payment: orderRequest.payment,
            totalPrice : totalPrice
        },
        shipping : {
            type: orderRequest.shipping.type,
            carrier: orderRequest. shipping.carrier
        },
        products: orderProducts
    }

    return order;
}

function convertToOrderResponse(order: Order): OrderResponse{
    const orderProducts: OrderProductResponse[] = [];
    if(order.products && order.products.length > 0){
        order.products.forEach((product) => {
            orderProducts.push({
                code: product.code,
                price: product.price
            });
        });
    }
    const orderResponse: OrderResponse = {
        email: order.pk,
        id: order.sk!,
        createdAt: order.createdAt!,
        products: orderProducts,
        billing: {
            payment: order.billing.payment as PaymentType,
            totalPrice: order.billing.totalPrice
        },
        shipping: {
            type: order.shipping.type as ShippingType,
            carrier: order.shipping.carrier as CarrierType
        }
    }

    return orderResponse;
}

function sendOrderEvent(order: Order, eventType: OrderEventType, lambdaRequestId: string){
    const productCodes: string[] = [];
    order.products.forEach((product) =>{
        productCodes.push(product.code);
    });
    const orderEvent: OrderEvent = {
        email: order.pk,
        orderId: order.sk!,
        billing: order.billing,
        shipping: order.shipping,
        requestId: lambdaRequestId,
        productCodes: productCodes
    };
    const envelope: Envelope = {
        eventType: eventType,
        data: JSON.stringify(orderEvent)
    };
    return snsClient.publish({
        TopicArn: orderEventsTopicArn,
        Message: JSON.stringify(envelope)
    }).promise();
}