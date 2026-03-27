from datetime import datetime
import os
import subprocess
import sys
import time
import json
from PlayMacro import PlayMacro


class PlayFlow:
    def __init__(self):
        self.read_battery_marco = None
        self.switch_to_util_marco = None
        self.switch_to_sol_marco = None
        self.voltage_cutoff_low = None
        self.voltage_cutoff_high = None
        self.wait_interval = None
        self.num_executions = None
        self.on_utility = False
        self.update_config()

    def update_config(self):
        fh = open("./config.json", 'r')
        config = json.load(fh)
        fh.close()
        self.read_battery_marco = PlayMacro(macro=config.get("read_battery_marco"))
        self.switch_to_util_marco = PlayMacro(macro=config.get("switch_to_util_marco"))
        self.switch_to_sol_marco = PlayMacro(macro=config.get("switch_to_sol_marco"))
        self.voltage_cutoff_low = config.get("voltage_cutoff_low")
        self.voltage_cutoff_high = config.get("voltage_cutoff_high")

    def strat_flow(self):
        bat_capacity = float(self.read_battery_marco.play_macro())
        time.sleep(2)
        if bat_capacity < self.voltage_cutoff_low:
            print(f"{datetime.now()} Battery Capacity at {bat_capacity} switching to utility")
            if not self.on_utility:
                self.switch_to_util_marco.play_macro()
                self.on_utility = True
            else:
                print(f"{datetime.now()} Already on utility")

        if bat_capacity > self.voltage_cutoff_high:
            print(f"{datetime.now()} Battery Capacity at {bat_capacity} switching to Solar")
            if self.on_utility:
                self.switch_to_sol_marco.play_macro()
                self.on_utility = False
            else:
                print(f"{datetime.now()}  Already on Solar")


if __name__ == '__main__':
    flow_obj = PlayFlow()
    flow_obj.strat_flow()
