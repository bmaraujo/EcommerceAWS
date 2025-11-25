import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class ProductsAppStack extends cdk.Stack {

    readonly productFetchHanlder : lambdaNodeJS.NodejsFunction;
    readonly productAdminHanlder : lambdaNodeJS.NodejsFunction;
    readonly productsDdb : dynamodb.Table;
    /**
     *
     */
    constructor(scope: Construct, id:string, props?: cdk.StackProps) {
        super(scope, id, props);
        
        this.productsDdb = new dynamodb.Table(this,"ProductsDdb", {
            tableName: 'products',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name : 'id',
                type : dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        });

        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this,`ProductsLayerVersionArn`);
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this,`ProductsLayerVersionArn`,productsLayerArn);

        this.productFetchHanlder = new lambdaNodeJS.NodejsFunction(this,"ProductFetchFunction",{
            functionName: "ProductFetchFunction",
            entry: "lambda/products/productFetchFunction.ts",
            handler:"handler",
            memorySize: 512,
            runtime: lambda.Runtime.NODEJS_22_X,
            timeout: cdk.Duration.seconds(5),
            bundling:{
                minify: true,
                sourceMap: false,
                nodeModules: ['aws-xray-sdk-core']
            },
            environment:{
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
        });
        this.productsDdb.grantReadData(this.productFetchHanlder);

        this.productAdminHanlder = new lambdaNodeJS.NodejsFunction(this,"ProductAdminFunction",{
            functionName: "ProductAdminFunction",
            entry: "lambda/products/productAdminFunction.ts",
            handler:"handler",
            memorySize: 512,
            runtime: lambda.Runtime.NODEJS_22_X,
            timeout: cdk.Duration.seconds(5),
            bundling:{
                minify: true,
                sourceMap: false,
                nodeModules: ['aws-xray-sdk-core']
            },
            environment:{
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer],
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_404_0
        });
        this.productsDdb.grantWriteData(this.productAdminHanlder);
    }
}
