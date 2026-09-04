from fastapi import FastAPI

app = FastAPI(
    title="GUARDIAN",
    description="AI powered risk assessment and action control system",
    version="0.1.0"
)

@app.get("/")
def root():
    return {
        "system": "GUARDIAN",
        "status": "online"
    }