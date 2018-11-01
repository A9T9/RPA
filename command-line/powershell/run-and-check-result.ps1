###########################################################################
#Script to run Kantu macros and check on their result via the command line
###########################################################################

#max time allowed for macro to complete (change this value of your macros takes longer to run)
$timeout_seconds = 60  



#Kill Chrome instances (if any open)
taskkill /F /IM chrome.exe /T 

#Launch Kantu for Chrome via command line
& "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "file:///D:/test/DemoComputerVision.html?direct=1&close=1&savelog=log1.txt" 


$i = 0
#Loop: Wait for macro to complete => Wait for log file to appear in download folder
while (!(Test-Path "D:/test/log1.txt") -and ($i -lt $timeout_seconds)) 
{ 
    Write-Host  "Waiting for macro to finish, seconds=" $i
    Start-Sleep 1
    $i = $i + 1 
}


#Macro done - or timeout exceeded:
if ($i -lt $timeout_seconds)
{
 
    #Read first line of log file
    $s = Get-Content "D:/test/log1.txt" -First 1

    #Check if macro completed OK or not
    If ($s -contains "Status=OK")
    {
        Write-Host "Macro completed OK" $s
    }
    else
    {
        Write-Host  "Macro had an error:" $s
    }
    remove-item "D:/test/log1.txt"
}
else
{
    Write-Host  "Macro did not complete within the time given."
    #Cleanup => Kill Chrome instance 
    taskkill /F /IM chrome.exe /T 
}

Write-Host "All done, time taken in seconds=" $i

