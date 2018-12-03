###########################################################################
#Script to run Kantu macros and check on their result via the command line
#V1.0.5, Dec 3, 2018
###########################################################################



######################################################################
function PlayAndWait ([string]$macro, [int]$timeout_seconds = 10, [string]$var1 = "-", [string]$var2 = "-", [string]$var3 = "-")
{
#This function opens Chrome or Firefox and runs the macro

#REQUIRED_ Define these two values 
$path_downloaddir = "D:\test\" #where the kantu log file is stored ("downloaded")
$path_autorun_html = "D:\test\cmdlinetest.html" #Location and name of the exported HTML page. ANY exported html macro will do, since we overwrite the content with &macro=

#INPUT:
# macro name
# optional: timeout value, default is 60s

#OUTPUT
# $status_int:  1 if all ok, negative if error
# $status_text: error text
# $status_runtime: macro runtime in seconds


#Optional: Kill Chrome instances (if any open)
#taskkill /F /IM chrome.exe /T 

#Create log file. Here Kantu will store the result of the macro run
$log = "log_" + $(get-date -f MM-dd-yyyy_HH_mm_ss) + ".txt" 
$path_log = $path_downloaddir + $log 

#Build command line
$cmd = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
#For FIREFOX use: $cmd = "${env:ProgramFiles}\Mozilla Firefox\firefox.exe"
$arg = """file:///"+ $path_autorun_html + "?macro="+ $macro + "&cmd_var1="+ $var1 + "&cmd_var2="+ $var2 + "&cmd_var3="+ $var3 + "&closeKantu=0&direct=1&savelog="+$log+""""

Start-Process -FilePath $cmd -ArgumentList $arg #Launch the browser and run the macro

#############Wait for macro to complete => Wait for log file to appear in download folder
$status_runtime = 0
Write-Host  "Log file will show up at " + $path_log
while (!(Test-Path $path_log) -and ($status_runtime -lt $timeout_seconds)) 
{ 
    Write-Host  "Waiting for macro to finish, seconds=" $status_runtime
    Start-Sleep 1
    $status_runtime = $status_runtime + 1 
}


#Macro done - or timeout exceeded:
if ($status_runtime -lt $timeout_seconds)
{
    #Read FIRST line of log file, which contains the status of the last run
    $status_text = Get-Content $path_log -First 1


    #Check if macro completed OK or not
    $status_int = -1     
    If ($status_text -contains "Status=OK") {$status_int = 1}

}
else
{
    $status_text =  "Macro did not complete within the time given:" + $timeout_seconds
    $status_int = -2
    #Cleanup => Kill Chrome instance 
    #taskkill /F /IM chrome.exe /T   
}

remove-item $path_log #clean up

$value = "" | Select-Object -Property ErrorNumber,ErrorText, Runtime
$value.ErrorNumber = $status_int
$value.ErrorText = $status_text
$value.Runtime = $status_runtime
return $value

}


###########################################################################
#        Main program starts here
###########################################################################

$testreport = "d:\test\testreport.txt"


#Test1: Running a sequence of macros in the same tab. This is like a test suite, but with full control from the script. This allows more detailed error reporting.

$testmacro = "cmdlinetest1"
$r = PlayAndWait $testmacro

$report = $testmacro + " ("+$r.ErrorNumber + ") runtime: "+$r.Runtime+" seconds, result: "+ $r.ErrorText
Write-Host $report
Add-content $testreport -value ($report)
Start-Sleep 1

$testmacro = "cmdlinetest2"
$r = PlayAndWait $testmacro

$report = $testmacro + " ("+$r.ErrorNumber + ") runtime: "+$r.Runtime+" seconds, result: "+ $r.ErrorText
Write-Host $report
Add-content $testreport -value ($report)
Start-Sleep 1

$testmacro = "cmdlinetest3"
$r = PlayAndWait $testmacro 25 111 222 333

$report = $testmacro + " ("+$r.ErrorNumber + ") runtime: "+$r.Runtime+" seconds, result: "+ $r.ErrorText
Write-Host $report
Add-content $testreport -value ($report)
Start-Sleep 1

#Test2: Run the same macro in a loop ("stress test")
For ($i=0; $i -le 2; $i++) {
$testmacro = "cmdlinetest"
$r = PlayAndWait $testmacro 25 $i 222 333

$report = "Loop="+$i + " " + $testmacro + " ("+$r.ErrorNumber + ") runtime: "+$r.Runtime+" seconds, result: "+ $r.ErrorText
Write-Host $report
Add-content $testreport -value ($report)
Start-Sleep 1
}