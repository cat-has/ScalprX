import { useState } from 'react'
import { useApp } from '../../app/store'
import { Dialog, Field } from '../../components/ui'

export function Onboarding() {
  const { settings, setSettings } = useApp()
  const [step, setStep] = useState(0)
  const [eq, setEq] = useState(String(settings.accountEquity))
  const [risk, setRisk] = useState(String(settings.riskPct))
  if (settings.onboarded) return null
  const finish = () => setSettings({ onboarded: true, accountEquity: Number(eq) > 0 ? Number(eq) : settings.accountEquity, riskPct: Number(risk) > 0 ? Number(risk) : settings.riskPct })
  return (
    <Dialog title={`Welcome to ScalprX (${step + 1}/3)`} onClose={finish}>
      {step === 0 && <><p><strong>Precision for every trade.</strong> ScalprX helps you read the market, plan entries, stops and targets, size risk and review your results.</p><p className="muted">It is a planning and journaling tool. It does not place trades, predict prices or give financial advice.</p></>}
      {step === 1 && <><p>Your data stays in this browser. There is no account and no server. Export a backup from Data and backup now and then, because clearing browser data deletes it.</p><p className="muted">Market prices are fetched from public exchange APIs. If they are unreachable, ScalprX tells you and never shows made-up prices.</p></>}
      {step === 2 && <><p>Set starting defaults for the risk calculator. You can change them any time in Settings.</p><div className="formgrid"><Field label="Account equity (USDT)" id="o-eq"><input id="o-eq" inputMode="decimal" value={eq} onChange={(e) => setEq(e.target.value)} /></Field><Field label="Risk per trade (%)" id="o-rp"><input id="o-rp" inputMode="decimal" value={risk} onChange={(e) => setRisk(e.target.value)} /></Field></div></>}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn ghost" onClick={finish}>Skip</button>
        <div className="row">{step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}{step < 2 ? <button className="btn primary" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn primary" onClick={finish}>Start</button>}</div>
      </div>
    </Dialog>
  )
}
