import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class ProductsAppLayersStack extends cdk.Stack{

    /**
     *
     */
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        const productsLayer = new lambda.LayerVersion(this,"ProductsLayer", {
            code: lambda.Code.fromAsset(`lambda/products/layers/productsLayer`),
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
            layerVersionName: "ProductsLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        new ssm.StringParameter(this,"ProductsLayerVersionArn",{
            parameterName: 'ProductsLayerVersionArn',
            stringValue: productsLayer.layerVersionArn
        });

         const productEventsLayer = new lambda.LayerVersion(this,"ProductEventsLayer", {
            code: lambda.Code.fromAsset(`lambda/products/layers/ProductEventsLayer`),
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
            layerVersionName: "ProductEventsLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        new ssm.StringParameter(this,"ProductEventsLayerVersionArn",{
            parameterName: 'ProductEventsLayerVersionArn',
            stringValue: productEventsLayer.layerVersionArn
        });
    }
}