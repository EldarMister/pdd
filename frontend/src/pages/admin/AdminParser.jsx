import { useEffect, useRef, useState } from "react"
import {
  adminRunParser,
  adminParserStatus,
  adminParserLogs,
  adminGetSettings,
  adminUpdateSettings,
  adminStopParser,
} from "../../api"

const calcSpeed = (delayMin, delayMax) => {
  const avgDelay = (parseInt(delayMin) + parseInt(delayMax)) / 2
  return Math.round(3600000 / avgDelay)
}

const SPEED_PRESETS = [
  { label: "????????", delayMin: 25000, delayMax: 40000, desc: "~90?140/???" },
  { label: "????????", delayMin: 12000, delayMax: 22000, desc: "~160?300/???" },
  { label: "?????????", delayMin: 8000, delayMax: 15000, desc: "~240?450/???" },
  { label: "??????", delayMin: 5000, delayMax: 10000, desc: "~360?720/???" },
]

const SCHEDULE_PRESETS = [
  { label: "?????? 2 ????", cron: "0 */2 * * *" },
  { label: "?????? 4 ????", cron: "0 */4 * * *" },
  { label: "?????? 6 ?????", cron: "0 */6 * * *" },
  { label: "?????? 8 ?????", cron: "0 */8 * * *" },
  { label: "?????? 12 ?????", cron: "0 */12 * * *" },
  { label: "??? ? ?????", cron: "0 2 * * *" },
]

const formatDate = (d) => {
  if (!d) return "?"
  return new Date(d).toLocaleString("ru-RU")
}

export default function AdminParser() {
  const [status, setStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState("success")
  const [savingSchedule, setSavingSchedule] = useState(false)
  const pollRef = useRef(null)

  // manual
  const [maxProducts, setMaxProducts] = useState("100")
  const [delayMin, setDelayMin] = useState("8000")
  const [delayMax, setDelayMax] = useState("20000")
  const [fetchDetails, setFetchDetails] = useState(true)

  // schedule
  const [schedEnabled, setSchedEnabled] = useState(true)
  const [schedCron, setSchedCron] = useState("0 */8 * * *")
  const [schedMax, setSchedMax] = useState("100")
  const [schedDelayMin, setSchedDelayMin] = useState("8000")
  const [schedDelayMax, setSchedDelayMax] = useState("20000")
  const [schedDetails, setSchedDetails] = useState(true)

  const showMsg = (text, type = "success") => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(""), 5000)
  }

  const load = async () => {
    const [statusRes, logsRes, settingsRes] = await Promise.all([
      adminParserStatus(),
      adminParserLogs(),
      adminGetSettings(),
    ])
    setStatus(statusRes.data)
    setLogs(logsRes.data)
    setRunning(statusRes.data.running)

    const s = settingsRes.data
    setMaxProducts(s.parser_max_products || "100")
    setDelayMin(s.parser_delay_min || "8000")
    setDelayMax(s.parser_delay_max || "20000")
    setFetchDetails(s.parser_fetch_details !== "false")

    setSchedEnabled(s.parser_schedule_enabled !== "false")
    setSchedCron(s.parser_schedule_cron || "0 */8 * * *")
    setSchedMax(s.parser_max_products || "100")
    setSchedDelayMin(s.parser_delay_min || "8000")
    setSchedDelayMax(s.parser_delay_max || "20000")
    setSchedDetails(s.parser_fetch_details !== "false")
  }

  useEffect(() => {
    load()
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(async () => {
        const res = await adminParserStatus()
        setRunning(res.data.running)
        if (!res.data.running) {
          clearInterval(pollRef.current)
          load()
        }
      }, 5000)
    }
    return () => clearInterval(pollRef.current)
  }, [running])

  const handleRunNow = async () => {
    try {
      await adminRunParser({
        keywords: "all",
        max_products: parseInt(maxProducts),
        delay_min: parseInt(delayMin),
        delay_max: parseInt(delayMax),
        fetch_details: fetchDetails,
      })
      setRunning(true)
      showMsg(`?????? ???????. ~${calcSpeed(delayMin, delayMax)} ???????/???`)
    } catch (err) {
      showMsg(err.response?.data?.error || "?????? ???????", "error")
    }
  }

  const handleStop = async () => {
    try {
      await adminStopParser()
      showMsg("????????? ?????????")
    } catch (err) {
      showMsg(err.response?.data?.error || "?????? ?????????", "error")
    }
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    try {
      await adminUpdateSettings({
        parser_schedule_enabled: schedEnabled ? "true" : "false",
        parser_schedule_cron: schedCron,
        parser_keywords: "all",
        parser_max_products: schedMax,
        parser_delay_min: String(schedDelayMin),
        parser_delay_max: String(schedDelayMax),
        parser_fetch_details: schedDetails ? "true" : "false",
      })
      showMsg("?????????? ?????????")
    } catch {
      showMsg("?????? ?????????? ??????????", "error")
    } finally {
      setSavingSchedule(false)
    }
  }

  const applySpeedPreset = (preset, target) => {
    if (target === "run") {
      setDelayMin(preset.delayMin)
      setDelayMax(preset.delayMax)
    } else {
      setSchedDelayMin(preset.delayMin)
      setSchedDelayMax(preset.delayMax)
    }
  }

  const last = status?.lastRun
  const added = last?.products_added || 0
  const updated = last?.products_updated || 0
  const skipped = last?.products_skipped || 0
  const statusLabel = running ? "????????" : "??????????"

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-100">?????? TaoBao</h1>
          <p className="text-slate-400 text-sm">?????????????? ?????? ??????? ?? Taobao ?? ???? ??????????</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-outline text-sm px-4 py-2">????????</button>
          <button onClick={handleSaveSchedule} className="btn-outline text-sm px-4 py-2">?????????</button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          msgType === "error"
            ? "bg-red-500/10 text-red-300 border-red-500/30"
            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
        }`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="admin-panel rounded-2xl p-4">
          <div className="text-sm text-slate-400 mb-2">??????</div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${running ? "bg-emerald-400" : "bg-slate-500"}`} />
            <span className="text-slate-100 font-semibold">{statusLabel}</span>
          </div>
          <div className="text-xs text-slate-400 mt-3">????????? ??????: {formatDate(last?.created_at)}</div>
        </div>
        <div className="admin-panel rounded-2xl p-4">
          <div className="text-sm text-slate-400 mb-2">?????????</div>
          <div className="text-2xl font-bold text-emerald-300">{added}</div>
          <div className="text-xs text-slate-500 mt-2">?? ????????? ??????</div>
        </div>
        <div className="admin-panel rounded-2xl p-4">
          <div className="text-sm text-slate-400 mb-2">?????????</div>
          <div className="text-2xl font-bold text-sky-300">{updated}</div>
          <div className="text-xs text-slate-500 mt-2">?? ????????? ??????</div>
        </div>
        <div className="admin-panel rounded-2xl p-4">
          <div className="text-sm text-slate-400 mb-2">?????????</div>
          <div className="text-2xl font-bold text-amber-300">{skipped}</div>
          <div className="text-xs text-slate-500 mt-2">?? ????????? ??????</div>
        </div>
      </div>

      {/* Run panel */}
      <div className="admin-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-100">??????</h2>
            <p className="text-xs text-slate-400">?????: ??? ????????? ?????????????</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRunNow} disabled={running} className="btn-primary flex items-center gap-2">
              {running ? <><span className="animate-spin inline-block">?</span> ????????...</> : "?????????"}
            </button>
            {running && (
              <button onClick={handleStop} className="btn-outline text-sm px-4 py-2">??????????</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">???????? ???????</label>
            <input
              type="number"
              value={maxProducts}
              onChange={(e) => setMaxProducts(e.target.value)}
              className="input text-sm"
              min={1}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={fetchDetails}
                onChange={(e) => setFetchDetails(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm text-slate-300">????????? ???????? ??????</span>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-slate-300 mb-2">????????: ~{calcSpeed(delayMin, delayMax)} ???????/???</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applySpeedPreset(p, "run")}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  parseInt(delayMin) === p.delayMin
                    ? "border-brand-500 bg-brand-500/10 text-brand-200"
                    : "border-white/10 text-slate-300 hover:border-brand-300"
                }`}
              >
                {p.label} <span className="text-slate-500 ml-1">{p.desc}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">???. ???????? (??)</label>
              <input type="number" value={delayMin} onChange={(e) => setDelayMin(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">????. ???????? (??)</label>
              <input type="number" value={delayMax} onChange={(e) => setDelayMax(e.target.value)} className="input text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="admin-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">??????????</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={schedEnabled}
              onChange={(e) => setSchedEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm font-medium text-slate-300">????????</span>
          </label>
        </div>

        <div className={`space-y-4 ${!schedEnabled ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="text-xs text-slate-400">?????????: ?????????????</div>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((p) => (
              <button
                key={p.cron}
                onClick={() => setSchedCron(p.cron)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  schedCron === p.cron
                    ? "border-brand-500 bg-brand-500/10 text-brand-200"
                    : "border-white/10 text-slate-300 hover:border-brand-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">????. ???????</label>
              <input type="number" value={schedMax} onChange={(e) => setSchedMax(e.target.value)} className="input text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={schedDetails}
                  onChange={(e) => setSchedDetails(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm text-slate-300">????????? ?????? ??????</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">???. ???????? (??)</label>
              <input type="number" value={schedDelayMin} onChange={(e) => setSchedDelayMin(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">????. ???????? (??)</label>
              <input type="number" value={schedDelayMax} onChange={(e) => setSchedDelayMax(e.target.value)} className="input text-sm" />
            </div>
          </div>
        </div>

        <button onClick={handleSaveSchedule} disabled={savingSchedule} className="btn-primary mt-4 text-sm py-2">
          {savingSchedule ? "????????..." : "????????? ??????????"}
        </button>
      </div>

      {/* Logs */}
      <div className="admin-panel rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-100">???? ???????</h2>
          <span className="text-xs text-slate-400">??????????? ?????? 5? ?? ????? ??????</span>
        </div>
        <div className="bg-slate-950/60 rounded-xl border border-white/10 p-4 max-h-64 overflow-auto text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-slate-500">????? ???? ???</div>
          ) : (
            logs.slice(0, 50).map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-1">
                <span className="text-slate-500 shrink-0">{new Date(log.created_at).toLocaleTimeString("ru-RU")}</span>
                <span className={`shrink-0 ${log.status === "error" ? "text-red-400" : log.status === "success" ? "text-emerald-400" : "text-sky-300"}`}>
                  {log.status}
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
