/*
This is a client to invoke Bedrock's Stable Diffusion model.
*/

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

var region = process.env.region;
const invoke_bedrock = async (prompt) => {
  var rand_seed = generate_random_seed(0, 4294967295);

  // Build the request payload for the Stable Diffusion model
  const params = { 
    contentType: 'application/json',
    accept: '*/*',
    modelId: 'stability.stable-diffusion-xl',
    body: `{
        "text_prompts":[
            {
                "text":"${prompt}"
            }],
        "cfg_scale":10,
        "seed":${rand_seed},
        "steps":50}`,
  };

  const client = new BedrockRuntimeClient({region: region});

  try {
    const command = new InvokeModelCommand(params);
    const bedrock_response = await client.send(command);
    return bedrock_response;
  } catch (e) { 
    throw e;
  }
};

function generate_random_seed(min, max) {  
  return Math.floor(
    Math.random() * (max - min) + min
  )
}


module.exports = invoke_bedrock;