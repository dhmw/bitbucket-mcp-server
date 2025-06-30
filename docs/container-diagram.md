# Container View - Bitbucket MCP Server

## Container View
**Containers of Bitbucket MCP Server:** _(key services, modules, etc.)_  
- `MCP Server Core` – `Node.js/TypeScript: Main MCP protocol server handling tool definitions, request routing, and response formatting`  
- `Bitbucket API Client` – `Axios HTTP Client: REST API client for Bitbucket Cloud operations including authentication and request handling`  
- `Tool Registry` – `TypeScript Module: Manages MCP tool definitions, schemas, and validation for Bitbucket operations`  
- `Authentication Manager` – `Environment Config: Handles Bitbucket credentials and workspace configuration from environment variables`  

**Container Interactions:** _(how containers communicate)_ 
- `MCP Server Core` → `Bitbucket API Client` – `Function calls to execute Bitbucket repository and pull request operations`  
- `MCP Server Core` → `Tool Registry` – `Retrieves tool definitions, validates requests, and formats responses`  
- `MCP Server Core` → `Authentication Manager` – `Gets Bitbucket credentials and workspace configuration`  
- `Bitbucket API Client` → `Bitbucket Cloud API` – `HTTPS REST API calls for repository, branch, and pull request management`  
- `MCP Client` → `MCP Server Core` – `JSON-RPC over stdio for MCP protocol communication`

```mermaid
C4Container
    title Container Diagram - Bitbucket MCP Server

    Person(aiAssistant, "AI Assistant", "Claude, ChatGPT, or other AI")
    System_Ext(bitbucketCloud, "Bitbucket Cloud API", "Git repository hosting platform")
    System_Ext(mcpClient, "MCP Client", "AI assistant application")

    System_Boundary(mcpSystem, "Bitbucket MCP Server") {
        Container(mcpCore, "MCP Server Core", "Node.js/TypeScript", "Handles MCP protocol, tool routing, and response formatting")
        Container(apiClient, "Bitbucket API Client", "Axios HTTP Client", "REST API client for Bitbucket Cloud operations")
        Container(toolRegistry, "Tool Registry", "TypeScript Module", "MCP tool definitions, schemas, and validation")
        Container(authManager, "Authentication Manager", "Environment Config", "Bitbucket credentials and workspace settings")
    }

    Rel(aiAssistant, mcpClient, "Uses")
    Rel(mcpClient, mcpCore, "MCP protocol (JSON-RPC over stdio)")
    Rel(mcpCore, apiClient, "Execute operations")
    Rel(mcpCore, toolRegistry, "Get tool definitions")
    Rel(mcpCore, authManager, "Get credentials")
    Rel(apiClient, bitbucketCloud, "HTTPS REST API")
```
