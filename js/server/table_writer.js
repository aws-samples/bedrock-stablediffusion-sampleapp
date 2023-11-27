/*
This is a client to write submission details to DynamoDB table.
*/
const { DynamoDBClient, ListTablesCommand, BillingMode, CreateTableCommand, waitUntilTableExists } = require("@aws-sdk/client-dynamodb");
const { PutCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const region = process.env.region;
const genai_table = "genaicontestsubmissions";

const ddb_client = new DynamoDBClient(region);
const doc_client = DynamoDBDocumentClient.from(ddb_client);

// Create table if it doesn't exist
const init = async () => {
  try {
    const list_tables_command = new ListTablesCommand({});
    const response = await ddb_client.send(list_tables_command); 
    if (!response.TableNames.includes(genai_table)) {
      const create_table_command = new CreateTableCommand({
        TableName: genai_table,
        BillingMode: BillingMode.PAY_PER_REQUEST,
        KeySchema: [
          { AttributeName: "emailid", KeyType: "HASH" }, // Partition key
        ],
        AttributeDefinitions: [
          { AttributeName: "emailid", AttributeType: "S" },
        ],
      })

      await ddb_client.send(create_table_command);
      const results = await waitUntilTableExists({client: ddb_client, maxWaitTime: 60}, {TableName: genai_table})
      if (results.state !== 'SUCCESS') {
        console.error(`${results.state} ${results.reason}`);
      }
    }
  } catch(e) {
    console.log("Table list throws err" + e);
    throw e;
  } 
}


const record_submission = async (uploadParams, s3filekey) => {
  const command = new PutCommand({
    TableName: genai_table,
    Item: {
      emailid: uploadParams['email'],
      name: uploadParams['name'],
      company: uploadParams['company'],
      prompt: uploadParams['prompt'],
      s3filepath: s3filekey
    },
  });

  try {
    await doc_client.send(command); 
  } catch(e) {
    console.log("Table write throws err" + e);
    throw e;
  }
}


module.exports = {
  init,
  record_submission
}
