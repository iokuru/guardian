from app.core.risk_types import RiskCategory, RiskSeverity
from app.services.severity import get_risk_severity


def test_destructive_is_high():
    assert get_risk_severity(RiskCategory.DESTRUCTIVE) == RiskSeverity.HIGH


def test_exfiltration_is_critical():
    assert get_risk_severity(RiskCategory.DATA_EXFILTRATION) == RiskSeverity.CRITICAL


def test_production_is_medium():
    assert get_risk_severity(RiskCategory.PRODUCTION) == RiskSeverity.MEDIUM


def test_temporary_files_are_low():
    assert get_risk_severity(RiskCategory.TEMPORARY_FILES) == RiskSeverity.LOW