import React from 'react'
import ReactPlayer from 'react-player/lazy'

/* Optional social embeds */
function Scripted({ src, onload }) {
  React.useEffect(() => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    if (onload) s.onload = onload
    document.body.appendChild(s)
    return () => {
      try {
        document.body.removeChild(s)
      } catch {}
    }
  }, [src, onload])
  return null
}

function Instagram({ url }) {
  return (
    <div>
      <Scripted
        src="https://www.instagram.com/embed.js"
        onload={() => window.instgrm?.Embeds?.process()}
      />
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
      />
    </div>
  )
}
function TikTok({ url }) {
  return (
    <div>
      <Scripted src="https://www.tiktok.com/embed.js" />
      <blockquote className="tiktok-embed" cite={url} style={{ maxWidth: 605, minWidth: 325 }} />
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
        Open on TikTok ↗
      </a>
    </div>
  )
}
function Twitter({ url }) {
  return (
    <div>
      <Scripted src="https://platform.twitter.com/widgets.js" />
      <blockquote className="twitter-tweet">
        <a href={url}></a>
      </blockquote>
    </div>
  )
}

export default function MediaPlayer({ url }) {
  if (!url) return null
  const u = url.toLowerCase()

  // Use official embeds for these:
  if (u.includes('instagram.com')) return <Instagram url={url} />
  if (u.includes('tiktok.com')) return <TikTok url={url} />
  if (u.includes('twitter.com') || u.includes('x.com')) return <Twitter url={url} />

  // Everything react-player supports (YouTube, Vimeo, Facebook, Twitch, DailyMotion, MP4/WebM…)
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '16 / 9' }}>
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playsinline
        config={{ file: { attributes: { playsInline: true } } }}
      />
    </div>
  )
}
