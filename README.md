# Sofie Monitor

This is the _Sofie Monitor_ application of the [_**Sofie** TV Automation System_](https://github.com/nrkno/Sofie-TV-automation/).

The _Sofie Monitor_ is a basic monitoring service.

## Developer Information

The application reads environment variable `SOFIE_MONITOR_PORT` to set another port than the default
port 3000. Useful when running locally and having [_Sofie Core_](https://github.com/nrkno/sofie-core/) running at the same time.

Set environment variable `DEBUG=true` to enable debug level logging to the console.

Set enviroment variable `CONTROL_SUB_DEVICES_CONFIG_PATH` to the path of the JSON file defining servers for `coreControl`. This is set by `yarn watch` to a example file in the repository for easy testing.


## General Sofie System Information
* [_Sofie_ Documentation](https://nrkno.github.io/sofie-core/)
* [_Sofie_ Releases](https://nrkno.github.io/sofie-core/releases)
* [Contribution Guidelines](CONTRIBUTING.md)
* [License](LICENSE)

---

_The NRK logo is a registered trademark of Norsk rikskringkasting AS. The license does not grant any right to use, in any way, any trademarks, service marks or logos of Norsk rikskringkasting AS._
