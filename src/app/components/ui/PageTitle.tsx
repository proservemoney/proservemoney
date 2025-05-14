import React from 'react';

interface PageTitleProps {
  title: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  return (
    <h1 className="text-2xl font-bold mb-6 mt-8">{title}</h1>
  );
} 