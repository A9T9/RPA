<#
.Synopsis
   Installs Firefox with an extension
.DESCRIPTION
   Silent setup of Firefox with an AddIn ready to run as described in https://support.mozilla.org/en-US/kb/deploying-firefox-with-extensions

Testing: If you already have Firefox installed, uninstall it first. Also, make sure to remove the Firefox profile folders in Appdata/Roaming and /Local. The Firefox uninstaller
does not remove these automatically.

The automatic deployment works "only" if the extension was not already installed before OR if you do a complete Firefox uninstall and profile folder removal

(c) Created 2021-09-03 by UI.Vision RPA Tech Support, License: MIT
#>
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Unzip
{
    param([string]$zipfile, [string]$outpath)
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipfile, $outpath)
}

function isInstalled 
{
    param([string]$programName)
    $checkInstalled = ((Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*).DisplayName -Match $programName).Length -gt 0

    return $checkInstalled
}

function installFirefoxWithAddIn()
{
    $workdir = $env:TEMP + '\Firefox'
    $instdir = "C:\Program Files\Mozilla Firefox"
    $distribution = $instdir + '\distribution'
    $extensions = $instdir + '\distribution\extensions'
    $setupEXE = $workdir + '\firefox_setup.exe'
    $sourceProgram = "https://download.mozilla.org/?product=firefox-latest&os=win64&lang=en-US"
    $sourceAddIn = "https://addons.mozilla.org/firefox/downloads/file/3777751/uivision_rpa-6.2.6-fx.xpi"
    $addIn_uid = '{190d04a6-e387-4f5b-9751-e0d222cf8275}'
    $path2XPI = $extensions + '\' + $addIn_uid + '.xpi' #in Mozilla folder. Delete if old extension is there

    if(-Not(isInstalled("Mozilla Firefox"))){
        #Create temp. directory
        If(-Not(Test-Path $workdir)){
            New-Item $workdir -ItemType Container | Out-Null
        }

        #Download Firefox Setup
        Invoke-WebRequest $sourceProgram -OutFile $setupEXE
    
        #Silent install as admin
        Start-Process -FilePath $setupEXE -ArgumentList "/S" -Verb RunAs
        Start-Sleep -s 35

        #CleanUp
        Remove-Item -Force $workdir -Recurse

        Write-Host "Installation routine of Firefox completed";
    } else {
        Write-Host "Firefox already installed";
    }

    #Download XPI file of AddIn
    If(-Not(Test-Path $distribution)){
        New-Item $distribution -ItemType Container | Out-Null
    }
    If(-Not(Test-Path $extensions)){
        New-Item $extensions -ItemType Container | Out-Null
    }
    if(-Not(Test-Path $path2XPI)){
        Invoke-WebRequest $sourceAddIn -Outfile $path2XPI
        Write-Host "AddIn " $addIn_uid " created";
    } else {
        Write-Host "Source file for extension already exists";
    }
}

installFirefoxWithAddIn("");
