"""
Equivalent to utils/timeUtils.js
"""
from datetime import datetime, date, time as time_cls


def get_appointment_status(appt_date, appt_time) -> str:
    """
    appt_date: datetime.date, datetime.datetime, or ISO string
    appt_time: datetime.time, timedelta, or "HH:MM[:SS]" string
    """
    if not appt_date:
        return "Past"

    if isinstance(appt_date, datetime):
        dt = appt_date
    elif isinstance(appt_date, date):
        dt = datetime(appt_date.year, appt_date.month, appt_date.day)
    else:
        dt = datetime.fromisoformat(str(appt_date))

    if appt_time:
        if isinstance(appt_time, time_cls):
            hours, minutes, seconds = appt_time.hour, appt_time.minute, appt_time.second
        else:
            # psycopg2 can return TIME as datetime.timedelta; handle string fallback too
            parts = str(appt_time).split(":")
            hours = int(parts[0])
            minutes = int(parts[1]) if len(parts) > 1 else 0
            seconds = int(float(parts[2])) if len(parts) > 2 else 0
        dt = dt.replace(hour=hours, minute=minutes, second=seconds, microsecond=0)

    return "Upcoming" if dt > datetime.now() else "Past"