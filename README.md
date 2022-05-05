# Sofie: The Modern TV News Studio Automation System (NRK Sofie Monitor)

Basic monitoring service for Sofie servers

## Developer information

Reads environment variable SOFIE_MONITOR_PORT to set another port than the default
port 3000. Useful when running locally and having sofie-core running at the same time :)

Set environment variable DEBUG=true to enable debug level logging to the console.

Set enviroment variable CONTROL_SUB_DEVICES_CONFIG_PATH to the path to the path to the json file defining servers for coreControl. This is set by `yarn watch` to a example file in the repository for easy testing
