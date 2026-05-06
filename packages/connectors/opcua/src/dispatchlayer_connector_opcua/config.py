# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

"""
OPC UA read-only connector configuration.

Implements the OPC UA connection parameters following IEC 62541.
All paths are read-only  no write, subscribe-with-control, or method calls.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class NodeQuality(str, Enum):
    """OPC UA node quality mapped from status code high-bits."""
    GOOD      = "GOOD"       # 0x00xxxxxx
    UNCERTAIN = "UNCERTAIN"  # 0x40xxxxxx
    BAD       = "BAD"        # 0x80xxxxxx
    MISSING   = "MISSING"    # No value returned


class SecurityMode(str, Enum):
    NONE            = "None"
    SIGN            = "Sign"
    SIGN_AND_ENCRYPT = "SignAndEncrypt"


@dataclass(frozen=True)
class OpcUaConfig:
    """OPC UA endpoint configuration."""

    endpoint:      str  = "opc.tcp://localhost:4840"
    namespace_uri: str  = "urn:dispatchlayer:scada"
    security_mode: SecurityMode = SecurityMode.NONE
    fixture_mode:  bool = True   # True = return fixture data; False = connect live
    timeout_s:     int  = 5

