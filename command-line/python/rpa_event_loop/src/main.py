import json
import time

from PlayFlow import PlayFlow


def start_monitoring():
    fh = open("./config.json", 'r')
    config = json.load(fh)
    fh.close()
    wait_interval = config.get("wait_interval")
    num_executions = config.get("num_executions")
    flow_obj = PlayFlow()
    if num_executions > 0:
        while num_executions > 0:
            flow_obj.strat_flow()
            time.sleep(wait_interval)
            num_executions = num_executions - 1
    else:
        while True:
            flow_obj.strat_flow()
            time.sleep(wait_interval)


if __name__ == '__main__':
    start_monitoring()
