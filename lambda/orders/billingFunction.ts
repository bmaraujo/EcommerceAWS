import { SNSEvent, Context } from 'aws-lambda';

export async function handler(event: SNSEvent, context: Context): Promise<void>{
    event.Records.forEach((r)=>{
        console.log(r.Sns);
    });

    return;
}