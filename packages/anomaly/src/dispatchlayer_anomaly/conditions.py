from enum import Enum


class AnomalyCondition(str, Enum):
    UNDERPRODUCTION = "underproduction"
    OVERPRODUCTION = "overproduction"
    CURTAILMENT = "curtailment"
    SENSOR_ANOMALY = "sensor_anomaly"
    ICING_RISK = "icing_risk"
    HIGH_TEMPERATURE = "high_temperature"
    COMMUNICATION_LOSS = "communication_loss"
