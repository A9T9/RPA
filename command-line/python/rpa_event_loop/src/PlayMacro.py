import json
import os
import subprocess
import time
from datetime import datetime

import pygetwindow as gw


class PlayMacro:
    def __init__(self, macro, var1='-', var2='-', var3='-'):
        self.var1 = var1
        self.var2 = var2
        self.var3 = var3
        self.macro = macro
        self.ui_vision_windows = None
        self.path_autorun_html = None
        self.browser_path = None
        self.timeout_seconds = None
        self.wait_interval = None
        self.num_executions = None
        self.log_location = None
        self.update_config()

    def get_ui_vision_windows(self):
        self.ui_vision_windows = []
        windows = gw.getAllWindows()
        for window in windows:
            if "UI.Vision".lower() in str(window.title).lower():
                self.ui_vision_windows.append(window)
        print(f"{datetime.now()} Found {len(self.ui_vision_windows)} ui.vision windows")

    def minimize_ui_vision_windows(self):
        self.get_ui_vision_windows()
        for window in self.ui_vision_windows:
            window.minimize()
        print(f"{datetime.now()} ui.vision windows minimized")

    def close_ui_vision_windows(self):
        self.get_ui_vision_windows()
        for window in self.ui_vision_windows:
            window.close()
        print(f"{datetime.now()} ui.vision windows closed")

    def update_config(self):
        fh = open("./config.json", 'r')
        config = json.load(fh)
        fh.close()
        self.path_autorun_html = config.get("path_autorun_html")
        self.browser_path = config.get("browser_path")
        self.timeout_seconds = config.get("timeout_seconds")
        self.log_location = config.get("log_location")
        if not isinstance(self.macro, str):
            raise f"macro must be a string value of macro location in UI vision app"
        if not os.path.exists(self.browser_path):
            raise f"browser path {self.browser_path} not found"
        if not os.path.exists(self.path_autorun_html):
            raise f"autorun html path {self.path_autorun_html} not found"
        if not os.path.exists(self.log_location):
            raise f"log location {self.log_location} not found"
        if not isinstance(self.timeout_seconds, int):
            raise f"timeout seconds value:{self.timeout_seconds} is not a integer"

    def play_macro(self):
        result = None
        log = f'log_{datetime.now().strftime('%m-%d-%Y_%H_%M_%S')}.txt'
        path_log = os.path.join(self.log_location, log)
        print(f"{datetime.now()} Log File will show up at {path_log}")
        args = f'file:///{self.path_autorun_html}?macro={self.macro}&cmd_var1={self.var1}&cmd_var2{self.var2}&cmd_var3{self.var3}&closeRPA=0&direct=1&savelog={path_log}'

        proc = subprocess.Popen([self.browser_path, args])

        time.sleep(2)

        self.minimize_ui_vision_windows()

        status_runtime = 0
        while not os.path.exists(path_log) and status_runtime < self.timeout_seconds:
            print(f"{datetime.now()} Waiting for macro to finish, seconds={status_runtime}")
            time.sleep(1)
            status_runtime = status_runtime + 1

        if status_runtime < self.timeout_seconds:
            with open(path_log) as f:
                status_text = f.readline()
                if 'Status=OK' in status_text:
                    print(f"{datetime.now()} {status_text}")
                    log_data = f.readlines()
                    for log_line in log_data[::-1]:
                        if "[echo] Result" in log_line:
                            print(f"{datetime.now()} {log_line}")
                            result = log_line.split(':')[1]
        else:
            status_text = f"Macro did not complete withing the time given: {self.timeout_seconds} seconds"
            print(f"{datetime.now()} {status_text}")
        proc.kill()
        self.close_ui_vision_windows()
        return result


if __name__ == '__main__':
    fh = open("./config.json", 'r')
    config = json.load(fh)
    fh.close()
    macro_obj = PlayMacro(macro=config.get("switch_to_sol_marco"))
    result = macro_obj.play_macro()
    print(f"Result is {result}")
