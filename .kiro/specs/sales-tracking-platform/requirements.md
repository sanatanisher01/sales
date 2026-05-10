# Requirements Document

## Introduction

A mobile-first web platform for sales force management. The platform supports four roles: Admin, Owner, Salesman, and Accountant. Admins create and manage Owner accounts. Owners manage their own team of Salesmen and Accountants, track live salesman locations on a map (with route trails similar to Blinkit/Zomato), and receive stop-duration alerts. Salesmen go on/off duty, share their live GPS location while on duty, and upload orders. Accountants view orders submitted by the salesmen under the same Owner.

## Glossary

- **Platform**: The mobile-first web application described in this document.
- **Admin**: A super-user who can create and manage Owner accounts.
- **Owner**: A user who manages a team of Salesmen and Accountants, views live tracking, and receives alerts.
- **Salesman**: A field user who goes on/off duty, shares live GPS location while on duty, and uploads orders.
- **Accountant**: A user who views orders submitted by Salesmen belonging to the same Owner.
- **Duty Session**: The period between a Salesman going on duty and going off duty.
- **Route Trail**: A polyline drawn on the map connecting the sequence of GPS coordinates recorded during a Duty Session.
- **Stop Event**: A state where a Salesman's GPS position has not changed beyond 50 metres for 5 consecutive minutes.
- **Order**: A record uploaded by a Salesman containing order details (items, quantity, customer info, timestamp).
- **Live Location**: The most recently received GPS coordinate for a Salesman who is currently on duty.

---

## Requirements

### Requirement 1: User Role Management by Admin

**User Story:** As an Admin, I want to create and manage Owner accounts, so that I can onboard new businesses onto the platform.

#### Acceptance Criteria

1. WHEN Admin submits a new Owner account form, THE Admin_Portal SHALL accept Owner name between 1 and 100 characters, email address up to 254 characters, and password between 8 and 128 characters.
2. WHEN Admin submits a new Owner account form with valid field values, THE Admin_Portal SHALL create the Owner account and send a verification email to the provided address within 2 minutes, and IF any required field is empty, exceeds its character limit, or contains a malformed email address, THEN THE Admin_Portal SHALL display a field-level validation error for each invalid field and SHALL NOT create the account.
3. WHEN an Admin submits an Owner registration form with an email address already registered, THE Platform SHALL reject the request and display an error message indicating the email is already in use.
4. WHEN Admin views the Owner account list, THE Admin_Portal SHALL display Owner accounts paginated at 25 accounts per page, sorted by registration date in descending order by default, showing each Owner's name, email, registration date, and active/inactive status.
5. WHEN Admin deactivates an Owner account, THE Platform SHALL prevent that Owner from logging in within 5 seconds of deactivation.
6. WHEN Admin deactivates an Owner account, THE Platform SHALL invalidate all active sessions for that Owner and their associated Salesmen and Accountants within 5 seconds.
7. IF the Admin_Portal receives an invalid or expired session token, THEN THE Admin_Portal SHALL redirect the Admin to the login page.

---

### Requirement 2: Team Management by Owner

**User Story:** As an Owner, I want to create and manage Salesman and Accountant accounts within my organisation, so that I can control who has access to my team's data.

#### Acceptance Criteria

1. WHEN Owner submits a new Salesman account form, THE Owner_Portal SHALL accept Salesman name between 1 and 100 characters, phone number between 7 and 15 digits, email address up to 254 characters, and password between 8 and 64 characters.
2. WHEN Owner submits a new Accountant account form, THE Owner_Portal SHALL accept Accountant name between 1 and 100 characters, email address up to 254 characters, and password between 8 and 64 characters.
3. WHEN an Owner creates a Salesman or Accountant account, THE Platform SHALL associate that account exclusively with the creating Owner.
4. WHEN an Owner submits a team-member creation form with an email address already registered under the same Owner, THE Platform SHALL reject the request and display a duplicate-email error.
5. THE Owner_Portal SHALL display a list of all Salesmen and Accountants belonging to the Owner, including their name, role, and current duty status as either "On Duty" or "Off Duty".
6. WHEN an Owner deactivates a team member, THE Platform SHALL prevent that team member from logging in within 5 seconds, and IF the team member has an active Duty Session at the time of deactivation, THEN THE Platform SHALL end that Duty Session within 5 seconds.
7. WHEN Owner submits a form with invalid field values, including an empty name, a non-numeric phone number, or a malformed email address, THE Owner_Portal SHALL display field-level validation errors for each invalid field and SHALL NOT submit the form.

---

### Requirement 3: Salesman Duty Session Management

**User Story:** As a Salesman, I want to go on duty and off duty from my mobile device, so that the platform knows when to track my location.

#### Acceptance Criteria

1. WHEN a Salesman taps "Go On Duty" and no active Duty Session exists, THE Salesman_App SHALL request GPS permission from the device.
2. WHEN GPS permission is granted, THE Salesman_App SHALL begin a new Duty Session.
3. IF GPS permission is denied by the device, THEN THE Salesman_App SHALL display a message instructing the Salesman to enable location permissions and SHALL NOT start a Duty Session.
4. WHILE a Duty Session is active, THE Salesman_App SHALL transmit the Salesman's GPS coordinates to the Platform at an interval between 5 and 10 seconds.
5. WHEN a Salesman taps "Go Off Duty" during an active Duty Session, THE Salesman_App SHALL end the Duty Session and stop transmitting GPS coordinates.
6. IF the Salesman_App loses GPS signal for more than 30 seconds during an active Duty Session, THEN THE Salesman_App SHALL display a warning indicating GPS signal loss, pause transmission attempts, and resume transmission automatically upon signal recovery.
7. THE Platform SHALL record each GPS coordinate transmission with a timestamp and associate it with the active Duty Session.
8. WHEN a Salesman taps "Go Off Duty" with no active Duty Session, THE Salesman_App SHALL display a message indicating there is no active session.
9. WHEN a Salesman taps "Go On Duty" while a Duty Session is already active, THE Salesman_App SHALL display a message indicating a session is already in progress and SHALL NOT start a new session.

---

### Requirement 4: Live Location Tracking by Owner

**User Story:** As an Owner, I want to see the live location of each on-duty Salesman on a map, so that I can monitor field activity in real time.

#### Acceptance Criteria

1. WHILE a Salesman is on duty, THE Owner_Portal SHALL display a named pin marker on the map showing that Salesman's initials or avatar at their current GPS coordinates.
2. WHEN a new GPS coordinate is received for an on-duty Salesman, THE Owner_Portal SHALL update that Salesman's marker position on the map within 5 seconds of receipt.
3. WHEN an Owner taps a Salesman's marker, THE Owner_Portal SHALL display the Salesman's name, current GPS coordinates, and the timestamp of the last received location in local time zone in HH:MM:SS format.
4. WHEN a Salesman ends a Duty Session, THE Owner_Portal SHALL remove that Salesman's marker from the live map view within 5 seconds.
5. IF no Salesmen are currently on duty, THEN THE Owner_Portal SHALL display an empty map with a message indicating no active Salesmen.
6. IF a GPS coordinate has not been received for an on-duty Salesman for more than 30 seconds, THEN THE Owner_Portal SHALL display a "signal lost" indicator on that Salesman's marker.
7. IF the map fails to load, THEN THE Owner_Portal SHALL display an error message and a retry button.

---

### Requirement 5: Route Trail Visualisation

**User Story:** As an Owner, I want to see the path a Salesman has travelled during a Duty Session drawn on the map, so that I can review the route taken.

#### Acceptance Criteria

1. WHILE a Duty Session is active, THE Owner_Portal SHALL render a continuous Route Trail polyline on the map connecting all recorded GPS coordinates for that session in chronological order.
2. WHEN a new GPS coordinate is received during an active Duty Session, THE Owner_Portal SHALL extend the Route Trail to include the new coordinate.
3. WHEN an Owner selects a past Duty Session from a list, THE Owner_Portal SHALL display the complete Route Trail for that session on the map.
4. THE Owner_Portal SHALL assign each Salesman a consistent colour from a palette of at least 6 distinct colours for their Route Trail, reusing colours only when all 6 are already in use by other Salesmen.
5. THE Owner_Portal SHALL display the total distance travelled for each Route Trail, calculated as the geodesic sum of all consecutive coordinate segments, displayed to two decimal places in kilometres.
6. IF a Duty Session contains only one GPS coordinate, THEN THE Owner_Portal SHALL display a single point marker instead of a polyline.
7. IF no past Duty Sessions exist for the Owner, THEN THE Owner_Portal SHALL display a message indicating no historical sessions are available.

---

### Requirement 6: Stop Event Detection and Owner Notification

**User Story:** As an Owner, I want to be notified when a Salesman has been stationary for approximately 5 minutes, so that I can be aware of prolonged stops during duty.

#### Acceptance Criteria

1. WHEN a Salesman's GPS coordinates have not changed by more than 50 metres for 5 consecutive minutes during an active Duty Session, THE Platform SHALL classify this as a Stop Event.
2. WHEN a Stop Event is detected, THE Platform SHALL send a push notification to the Owner containing the Salesman's name, the stop location address (reverse-geocoded), and the stop start time in ISO 8601 format.
3. WHILE a Stop Event is active, THE Owner_Portal SHALL display an in-app alert banner showing the Salesman's name, stop location, and a live-updating elapsed duration counter incrementing in whole minutes.
4. WHEN a Stop Event is resolved (Salesman moves more than 50 metres), THE Owner_Portal SHALL update the banner to show a "Resolved" status and the total stop duration in whole minutes, then automatically dismiss the banner after 30 seconds.
5. WHEN a Stop Event is detected, THE Platform SHALL record the stop start time and the GPS coordinates of the stop location.
6. WHEN a Stop Event is resolved, THE Platform SHALL record the end time of the Stop Event.
7. WHEN a Duty Session ends with an active unresolved Stop Event, THE Platform SHALL record the Duty Session end time as the Stop Event end time.
8. IF push notification delivery fails, THEN THE Platform SHALL retry delivery up to 3 times at 30-second intervals.
9. IF reverse-geocoding of the stop location fails, THEN THE Platform SHALL include the raw GPS coordinates (latitude, longitude) in the notification in place of the address.

---

### Requirement 7: Order Upload by Salesman

**User Story:** As a Salesman, I want to upload order details from my mobile device, so that the Owner and Accountant can see the orders I have taken.

#### Acceptance Criteria

1. THE Salesman_App SHALL provide an order entry form accepting customer name (1–100 characters), customer phone number (7–15 digits), a list of one or more line items each with product name (1–100 characters), quantity (positive integer 1–9999), and unit price (non-negative decimal up to 2 decimal places), and an optional note.
2. WHEN a Salesman submits a valid order form, THE Platform SHALL store the order with a server-generated timestamp, the Salesman's ID, and the Owner's ID.
3. IF the customer phone number does not match a pattern of 7 to 15 digits, or any required field fails its validation rule, THEN THE Salesman_App SHALL display a field-level validation error for each invalid field and SHALL NOT submit the order.
4. THE Platform SHALL associate each submitted order with the Owner to whom the Salesman belongs.
5. WHEN the Platform confirms successful order storage, THE Salesman_App SHALL display a confirmation message and reset all form fields to their empty or default state.
6. WHILE a Salesman is authenticated, THE Salesman_App SHALL allow order submission regardless of the Salesman's current duty status.
7. IF the Platform returns a storage error, THEN THE Salesman_App SHALL display an error message and retain the current form data so the Salesman can retry submission.
8. THE Salesman_App SHALL queue order submissions made while offline and transmit them automatically when network connectivity is restored.

---

### Requirement 8: Order Visibility for Owner and Accountant

**User Story:** As an Owner and as an Accountant, I want to view all orders submitted by Salesmen in my organisation, so that I can monitor sales activity and manage accounts.

#### Acceptance Criteria

1. THE Owner_Portal SHALL display a list of all orders submitted by Salesmen belonging to the Owner, sorted by submission timestamp in descending order by default.
2. THE Accountant_Portal SHALL display a list of all orders submitted by Salesmen belonging to the same Owner as the Accountant, sorted by submission timestamp in descending order by default.
3. WHEN an Owner or Accountant selects an order from the list, THE Platform SHALL display the full order details including customer name, customer phone number, line items, total value (sum of quantity × unit price for all line items, displayed to 2 decimal places), submission timestamp, and the submitting Salesman's name.
4. THE Owner_Portal SHALL provide filters to narrow the order list by Salesman name, date range, and order status (Pending, Confirmed, Delivered, Cancelled).
5. THE Accountant_Portal SHALL provide filters to narrow the order list by Salesman name and date range.
6. THE Platform SHALL make a newly submitted order visible in the Owner_Portal and Accountant_Portal within 10 seconds of submission.
7. WHEN the order list is empty after applying filters, THE Portal SHALL display a "No orders found" message.
8. THE Owner_Portal SHALL allow the Owner to export the currently filtered order list as a CSV file.

---

### Requirement 9: Authentication and Session Security

**User Story:** As any user of the platform, I want my session to be secure, so that unauthorised parties cannot access my data.

#### Acceptance Criteria

1. THE Platform SHALL authenticate all users via email address and password before granting access to any portal.
2. WHEN a user submits incorrect credentials three consecutive times, THE Platform SHALL lock that account for 15 minutes, display the remaining lockout time to the user, and reset the failed-attempt counter after a successful authentication.
3. WHEN an authenticated session has been idle (defined as no authenticated HTTP request received by the server) for 30 minutes, THE Platform SHALL invalidate the session token and redirect the user to the login page.
4. THE Platform SHALL transmit all data between client and server over HTTPS.
5. IF a request is received with an invalid or expired session token, THEN THE Platform SHALL return an HTTP 401 response and redirect the client to the login page.
6. THE Platform SHALL store passwords using an adaptive hashing algorithm (such as bcrypt or argon2) with a configured work factor and a per-user salt.
7. THE Platform SHALL enforce a minimum password length of 12 characters at both registration and password-change time.

---

### Requirement 10: Mobile-First Responsive Interface

**User Story:** As any user accessing the platform from a mobile device, I want the interface to be optimised for small screens, so that I can use all features comfortably on my phone.

#### Acceptance Criteria

1. THE Platform SHALL render all portal views without horizontal scrolling, content overflow, or overlapping elements at viewport widths between 320 and 2560 CSS pixels.
2. THE Platform SHALL render all interactive touch targets at a minimum size of 44×44 CSS pixels with at least 8 CSS pixels of spacing between adjacent targets.
3. THE Salesman_App SHALL achieve a Google Lighthouse mobile performance score of 80 or above, measured on a simulated mid-tier mobile device with throttled CPU and network conditions.
4. THE Platform SHALL display map views using a responsive container that occupies the full viewport width on screens narrower than 768 px.
5. WHERE a device supports PWA installation, THE Platform SHALL provide a web app manifest and service worker enabling the Salesman_App to be installed as a Progressive Web App, with the service worker caching the application shell for offline access.
