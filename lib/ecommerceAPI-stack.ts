import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { HttpMethod } from "aws-cdk-lib/aws-lambda";

interface ECommerceAPIProps extends cdk.StackProps{
    productsFetchHandler : lambdaNodeJS.NodejsFunction;
    productsAdminHandler : lambdaNodeJS.NodejsFunction;
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

        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);

        const productsResource = api.root.addResource("products");
        productsResource.addMethod(HttpMethod.GET, productsFetchIntegration);
        const productIdResource = productsResource.addResource("{id}");
        productIdResource.addMethod(HttpMethod.GET,productsFetchIntegration);

        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);
        productsResource.addMethod(HttpMethod.POST, productsAdminIntegration);
        productIdResource.addMethod(HttpMethod.PUT, productsAdminIntegration);
        productIdResource.addMethod(HttpMethod.DELETE, productsAdminIntegration);
    }
}