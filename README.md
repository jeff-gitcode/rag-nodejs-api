# RAG LLM Node.js API

## Overview
This project implements a Retrieval Augmented Generation (RAG) API using Node.js and TypeScript. It leverages Langchain for RAG, Weaviate as the vector database, and Ollama as the language model, all while adhering to clean architecture principles.

## System Architecture Sequence Diagram

Here's a sequence diagram illustrating the system architecture and request flow:

```mermaid
sequenceDiagram
    participant User
    participant HTTP Client
    participant RAGController
    participant RAGService
    
    box RAG Components
        participant VectorRepository
        participant EmbeddingService
        participant LLMClient
    end
    
    participant WeaviateClient
    participant Weaviate
    participant OllamaClient
    participant Ollama

    User->>HTTP Client: Sends HTTP Request (e.g., "What is RAG?")
    HTTP Client->>RAGController: Receives HTTP Request
    RAGController->>RAGService: Calls generateResponse(query, topic)
    
        note right of RAGService: RAG Process Begins
        
        RAGService->>VectorRepository: Calls queryVectorByContentAndTopic(query, topic, limit=3)
        VectorRepository->>WeaviateClient: Queries for similar documents
        WeaviateClient->>Weaviate: Executes Semantic Search (nearText + topic filter)
        Weaviate-->>WeaviateClient: Returns Top 3 Relevant Documents
        WeaviateClient-->>VectorRepository: Returns Document Data
        VectorRepository-->>RAGService: Returns Document Data
        
        RAGService->>RAGService: Augments query with retrieved context
        
        RAGService->>LLMClient: Calls getResponse(augmentedQuery)
        LLMClient->>Ollama: Sends Prompt with Retrieved Context
        Ollama-->>LLMClient: Generates Response Based on Context
        LLMClient-->>RAGService: Returns Generated Response
        
        note right of RAGService: RAG Process Complete
    
    RAGService-->>RAGController: Returns Enhanced Response
    RAGController-->>HTTP Client: Returns HTTP Response
    HTTP Client-->>User: Displays Response
    
        note right of RAGService: Document Insertion Flow
        User->>HTTP Client: Sends Document for Indexing
        HTTP Client->>RAGController: POST /api/rag/insert
        RAGController->>RAGService: Calls insertData(content, metadata)
        RAGService->>EmbeddingService: Calls generateEmbedding(content)
        EmbeddingService->>Ollama: Requests Text Embedding
        Ollama-->>EmbeddingService: Returns Vector Embedding
        EmbeddingService-->>RAGService: Returns Vector Embedding
        RAGService->>VectorRepository: Calls upsertVector(id, content, vector, metadata)
        VectorRepository->>WeaviateClient: Stores Document with Vector
        WeaviateClient->>Weaviate: Inserts Vector and Document
        Weaviate-->>WeaviateClient: Confirms Storage
        WeaviateClient-->>VectorRepository: Confirms Operation
        VectorRepository-->>RAGService: Operation Complete
        RAGService-->>RAGController: Returns Success
        RAGController-->>HTTP Client: Returns Success Response
```

## Project Structure
The project is organized into several layers, following the clean architecture approach:

- **src/application**: Contains services and interfaces for application logic.
- **src/domain**: Contains models and repositories for business logic.
- **src/infrastructure**: Contains database clients, LLM clients, and configuration files.
- **src/presentation**: Contains controllers, routes, and middleware for handling HTTP requests.
- **src/tests**: Contains unit and integration tests, as well as HTTP request tests.

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- Docker and Docker Compose

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd rag-nodejs-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your configuration settings.
### Ollama Setup

1.  **Pull a Model:**  Ollama requires a model to be loaded. You can do this via the command line *inside* the running ollama container. First, find the container ID:

 ```bash
 docker ps
 ```

2.  Then, execute the `ollama pull` command *inside* the container:

 ```bash
 docker exec -it <container_id> ollama pull llama3.2
 ```

### Running the Application
1. Start the Ollama LLM service using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Start the Node.js application:
   ```
   npm start
   ```

### Testing
- **Unit Tests**: Run unit tests using:
  ```
  npm run test:unit
  ```

- **Integration Tests**: Run integration tests using:
  ```
  npm run test:integration
  ```

- **HTTP Tests**: Use the `test.http` file in the `src/tests/http` directory to manually test API endpoints.

## Usage
Once the application is running, you can send HTTP requests to the API endpoints defined in the `ragRoutes.ts` file. The API will process queries using the RAGService, interacting with the Weaviate vector database and the Ollama LLM.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.