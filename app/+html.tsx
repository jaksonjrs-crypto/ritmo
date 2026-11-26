import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

const isProduction = process.env.NODE_ENV === "production";

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="pt-BR" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#758A32" />
        <meta name="description" content="Tarefas, tempo e metas em um só lugar." />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ritmo" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa-icon-192.png" />
        <title>Ritmo — foco no seu dia</title>
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {isProduction ? <script src="/register-service-worker.js" defer /> : null}
        {bodyNodes}
      </body>
    </html>
  );
}
