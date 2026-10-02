from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.agents.models import Agent
from app.domains.agents.schemas import AgentCreate

DEFAULT_AGENTS = [
    {
        "agent_id": "agent_auto_remediate_01",
        "name": "Cloud Custodian Auto-Remediator",
        "description": "Automated AWS IAM and Security Group posture remediation agent",
        "environment": "Production",
        "status": "ACTIVE",
    },
    {
        "agent_id": "agent_customer_support_llm",
        "name": "Customer Data Sync Worker",
        "description": "Background LLM agent managing user account imports and migrations",
        "environment": "Production",
        "status": "ACTIVE",
    },
    {
        "agent_id": "agent_ci_deploy_bot",
        "name": "GitHub CI/CD Deployment Bot",
        "description": "Deploys microservices into staging and production clusters",
        "environment": "Staging",
        "status": "ACTIVE",
    },
]


def seed_default_agents(db: Session, workspace_id: int = 1):
    existing = db.scalars(select(Agent).where(Agent.workspace_id == workspace_id)).all()
    if not existing:
        for a in DEFAULT_AGENTS:
            agent = Agent(
                workspace_id=workspace_id,
                agent_id=a["agent_id"],
                name=a["name"],
                description=a["description"],
                environment=a["environment"],
                status=a["status"],
            )
            db.add(agent)
        db.commit()


def list_agents(db: Session, workspace_id: int = 1) -> list[Agent]:
    seed_default_agents(db, workspace_id)
    return list(
        db.scalars(
            select(Agent)
            .where(Agent.workspace_id == workspace_id)
            .order_by(Agent.created_at.desc())
        )
    )


def register_agent(db: Session, data: AgentCreate, workspace_id: int = 1) -> Agent:
    agent = Agent(
        workspace_id=workspace_id,
        agent_id=data.agent_id,
        name=data.name,
        description=data.description,
        environment=data.environment,
        status="ACTIVE",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent
