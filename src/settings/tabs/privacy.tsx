import { isFreeUsageTier, usageStatisticsDefault } from '@/services/usage/preferences'
import React, { useState } from 'react'
import { connect } from 'react-redux'
import { Switch, Button, Modal } from 'antd'
import * as actions from '@/actions'
import storage from '@/common/storage'

function PrivacyTab({ config, updateConfig }: any) {
  const [preview, setPreview] = useState('')
  const freeTier = isFreeUsageTier(config)
  return <div>
    <h3>Share basic usage statistics</h3>
    <Switch aria-label="Share basic usage statistics" checked={usageStatisticsDefault(config)}
      onChange={value => {
        if (freeTier && !value) {
          Modal.info({
            title: 'Choose another AI option first',
            content: 'To turn off usage statistics, first select an AI option other than the free tier in Settings > AI. Then return here to turn this switch off.'
          })
          return
        }
        updateConfig({ shareUsageStatistics: value })
        if (value) Modal.success({ title: 'Thank you!', content: 'Your usage counts help us improve Ui.Vision.' })
      }} />
    <br /><br />
    <p>Help us understand which features people use and whether Ui.Vision keeps working for them.</p>
    <p>We send daily counts of macro outcomes, AI provider categories, MCP tools, XModule use and command names,
      along with your extension version and a random installation ID. You can view the data below in "View usage counts".</p>
    <p>Usage statistics never include prompts, macro contents, command arguments, page addresses, screenshots or API keys.
      Individual installation statistics are kept for 90 days.</p>
    <p>Usage statistics are required for the free Ui.Vision AI tier. If you switch to any other AI option (including Ui.Vision AI PRO), you can turn them off here.</p>
    <p>Turning this off stops future usage reporting and clears unsent counts.</p>
    <Button onClick={async () => setPreview(JSON.stringify((await storage.get('usageStatisticsV1')) || { days: {} }, null, 2))}>
      View usage counts
    </Button>
    {preview && <pre style={{ maxHeight: 360, overflow: 'auto' }}>{preview}</pre>}
  </div>
}
export default connect((state: any) => ({ config: state.config }), { updateConfig: actions.updateConfig })(PrivacyTab)
