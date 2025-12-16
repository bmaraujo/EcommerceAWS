import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { HttpMethod } from "aws-cdk-lib/aws-lambda";

interface ECommerceAPIProps extends cdk.StackProps{
    productsFetchHandler : lambdaNodeJS.NodejsFunction;
    productsAdminHandler : lambdaNodeJS.NodejsFunction;
    ordersHandler: lambdaNodeJS.NodejsFunction;
}

export class EcommerceAPIStack extends cdk.Stack {


    constructor(scope: Construct, id:string, props: ECommerceAPIProps) {
        super(scope, id, props);

        const logGroup = new cwlogs.LogGroup(this,"EcommerceAPILogs");

        const api = new apigateway.RestApi(this,"ECommerceAPI", {
            restApiName : "ECommerceAPI",
            deployOptions:{
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod: true,
                    ip: true,
                    protocol:true,
                    requestTime: true,
                    resourcePath:true,
                    responseLength: true,
                    status: true,
                    caller: true,
                    user: true
                })
            },
            cloudWatchRole: true
        });

        this.createProductsServices(props, api);
        this.createOrdersServices(props,api);
    }

    private createProductsServices(props: ECommerceAPIProps, api: apigateway.RestApi) {
        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);

        const productsResource = api.root.addResource("products");
        productsResource.addMethod(HttpMethod.GET, productsFetchIntegration);
        const productIdResource = productsResource.addResource("{id}");
        productIdResource.addMethod(HttpMethod.GET, productsFetchIntegration);

        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);
        const productRequestValidator = this.createProductValidator(api);

        productsResource.addMethod(HttpMethod.POST, productsAdminIntegration, productRequestValidator);
        productIdResource.addMethod(HttpMethod.PUT, productsAdminIntegration, productRequestValidator);
        productIdResource.addMethod(HttpMethod.DELETE, productsAdminIntegration);
    }

    private createOrdersServices(props: ECommerceAPIProps, api: apigateway.RestApi){
        const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler);

        const ordersResource = api.root.addResource("orders");

        ordersResource.addMethod(HttpMethod.GET, ordersIntegration);

        const orderDeletionValidator = new apigateway.RequestValidator(this, 'OrderDeletionValidator',{
            restApi:api,
            requestValidatorName: 'OrderDeletionValidator',
            validateRequestParameters: true
        });

        ordersResource.addMethod(HttpMethod.DELETE, ordersIntegration, {
            requestParameters: {
                'method.request.querystring.email': true,
                'method.request.querystring.orderId': true
            },
            requestValidator : orderDeletionValidator
        });
        const orderRequestValidator = new apigateway.RequestValidator(this,"OrderRequestValidator", {
            restApi: api,
            requestValidatorName: "Order request validator",
            validateRequestBody: true
        });
        const orderModel = new apigateway.Model(this, "OrderModel",{
            modelName: "OrderModel",
            restApi: api,
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    email: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    productIds: {
                        type: apigateway.JsonSchemaType.ARRAY,
                        minItems: 1,
                        items: {
                            type: apigateway.JsonSchemaType.STRING
                        }
                    },
                    payment: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ["CASH","DEBIT_CARD","CREDIT_CARD"]
                    }
                },
                required: ["email","productIds","payment"]
            }
        });
        ordersResource.addMethod(HttpMethod.POST, ordersIntegration, {
            requestValidator: orderRequestValidator,
            requestModels: {
                "application/json":orderModel
            }
        });
    }

    private createProductValidator(api: apigateway.RestApi): apigateway.MethodOptions{
        const productRequestValidator = new apigateway.RequestValidator(this,"ProductRequestValidator", {
            restApi: api,
            requestValidatorName: "Product request validator",
            validateRequestBody: true
        });

        const productModel = new apigateway.Model(this, "ProductModel",{
            modelName: "ProductModel",
            restApi: api,
            contentType: "application/json",
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    productName: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    code: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    price: {
                        type: apigateway.JsonSchemaType.NUMBER
                    },
                    model: {
                        type: apigateway.JsonSchemaType.STRING
                    },
                    productUrl: {
                        type: apigateway.JsonSchemaType.STRING
                    }
                },
                required: ["productName","code"]
            }
        });

        return {
            requestValidator: productRequestValidator,
            requestModels: {
                "application/json":productModel
            }
        }
    }
}