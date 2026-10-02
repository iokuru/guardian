from pydantic import BaseModel


class IntegrationSnippet(BaseModel):
    language: str
    filename: str
    code: str


class IntegrationSnippetResponse(BaseModel):
    api_endpoint: str
    api_key_sample: str
    snippets: list[IntegrationSnippet]
