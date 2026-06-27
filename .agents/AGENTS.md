# Project Rules and Local Environment Configuration

## Local Tooling and SDK Status
- **Google Cloud SDK**: Already installed and authenticated on the local host machine.
  - **Status**: Installed & Active
  - **Authentication**: User is authenticated with gcloud CLI.
  - **Executable Paths**: If the `gcloud` command is not found in the current terminal session's `PATH` (due to path caching), it is located at:
    `C:\Users\ASUS\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`
  - **Path Refresh Command**: To refresh PATH in the current PowerShell terminal session and execute gcloud/bq commands:
    `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
