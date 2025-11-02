// utils/timeUtils.js
export const getAppointmentStatus = (date, time) => {
  if (!date) return "Past";

  // Make sure date is a Date object
  let appointmentDate = new Date(date);

  if (time) {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    appointmentDate.setHours(hours, minutes, seconds || 0, 0);
  }

  // Compare with current date/time
  return appointmentDate > new Date() ? "Upcoming" : "Past";
};
