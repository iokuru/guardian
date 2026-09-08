import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.analysis import router as analysis_router
from app.api.audit import router as audit_router


app = FastAPI(title="GUARDIAN")


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id

    return response


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError,
):
    response = JSONResponse(
        status_code=500,
        content={"detail": "Database operation failed"},
    )

    response.headers["X-Request-ID"] = request.state.request_id

    return response


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(analysis_router)
app.include_router(auth_router)
app.include_router(audit_router)