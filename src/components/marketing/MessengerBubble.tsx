import { FACEBOOK_PAGE } from "@/lib/constants";

export function MessengerBubble() {
  return (
    <a
      href={`https://m.me/${"CreativeDigitalAccounting"}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fb-bubble no-print"
      aria-label="Пишете ни в Messenger"
      title="Пишете ни в Messenger"
      data-fb={FACEBOOK_PAGE}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.03.57.62.94 1.14.71l1.98-.87c.17-.07.36-.09.54-.04 1.21.33 2.5.51 3.77.51 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46l-2.93 4.66c-.47.74-1.47.93-2.18.4l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.18-.68-.62l2.93-4.66c.47-.74 1.47-.93 2.18-.4l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.18.68.62z" />
      </svg>
      <span className="fb-label">Пишете ни</span>
    </a>
  );
}
