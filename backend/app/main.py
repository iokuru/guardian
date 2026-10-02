import os
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.analysis import router as analysis_router
from app.api.audit import router as audit_router
from app.api.reviews import router as reviews_router
from app.api.policies import router as policies_router
from app.api.agents import router as agents_router
from app.api.integrations import router as integrations_router

app = FastAPI(
    title="Guardian",
    description="Action review and policy enforcement for automated systems.",
    version="2.0.0",
)

cors_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError,
):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    response = JSONResponse(
        status_code=500,
        content={"detail": "Database operation failed"},
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


# Root and v1 routers
app.include_router(analysis_router)
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(audit_router)
app.include_router(audit_router, prefix="/api/v1")
app.include_router(reviews_router)
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(policies_router)
app.include_router(policies_router, prefix="/api/v1")
app.include_router(agents_router)
app.include_router(agents_router, prefix="/api/v1")
app.include_router(integrations_router)
app.include_router(integrations_router, prefix="/api/v1")