import asyncio
from dotenv import load_dotenv
from database.connection import connect_to_mongo, close_mongo_connection
from llm.api_router import get_completion

load_dotenv()


async def main():
    print("=== Testing Database Connection ===")
    await connect_to_mongo()

    print("\n=== Testing Full LLM Router Rotation ===")
    prompt = [{"role": "user", "content": "Respond with: 'Guardrail LLM Router is operational!'"}]
    result = await get_completion(prompt)

    print("\n=== Final Router Output ===")
    print(f"Success: {result['text'] is not None}")
    print(f"Provider Used: {result['model_used']}")
    print(f"Response: {result['text']}")

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
