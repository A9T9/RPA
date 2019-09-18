# Call this script with XRunAndWait and these parameters:
# Powershell.exe 
# -executionpolicy bypass -File  c:\test\test1.ps1  c:\test\test.txt "Text to store"

# Doc: https://ui.vision/docs/xrun

#Declare our named parameters here...
param(
   [string] $path = "c:\test\default.txt",
   [string] $data = "---"
)

Write-Output "You specified $path and $data"

Add-Content $path $data

#The script exit code is stored in the ${!xrun_exitcode} internal variable

Exit 12345