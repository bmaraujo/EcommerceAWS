import { Context, SQSEvent } from 'aws-lambda';
import * as AWSXRay from 'aws-xray-sdk';

AWSXRay.captureAWS(require('aws-sdk'));

export async function handler(event: SQSEvent, context: Context): Promise<void>{
    event.Records.forEach(r=>{
        console.log(r);
        const body = JSON.parse(r.body);
        console.log(body);
    });
    return;
}