"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { AppProviders } from "./AppProviders";
import { DocumentLocaleAttributes } from "./DocumentLocaleAttributes";

type Props = {
  children: ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AbstractIntlMessages = Record<string, any>;

export function IntlAndThemeProvider({ children, messages, locale }: Props) {
  return (
    <AppProviders>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <DocumentLocaleAttributes />
        {children}
      </NextIntlClientProvider>
    </AppProviders>
  );
}
