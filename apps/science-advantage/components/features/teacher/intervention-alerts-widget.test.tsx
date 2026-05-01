import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InterventionAlertsWidget } from './intervention-alerts-widget';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('InterventionAlertsWidget', () => {
  const mockClasses = [
    { id: 'class-1', name: 'Grade 3A' },
    { id: 'class-2', name: 'Grade 3B' },
  ];

  const mockAlerts = [
    {
      studentId: 'student-1',
      studentName: 'Anan Prasert',
      avatarInitials: 'AP',
      alertSeverity: 'critical' as const,
      weakStandards: [
        {
          code: 'Sc1.1-G3',
          title: 'Plan investigations',
          masteryLevel: 0.38,
          lastAssessedAt: '2025-10-27T09:00:00Z',
        },
        {
          code: 'Sc1.2-G3',
          title: 'Conduct experiments',
          masteryLevel: 0.42,
          lastAssessedAt: '2025-10-28T09:00:00Z',
        },
        {
          code: 'Sc1.3-G3',
          title: 'Record data',
          masteryLevel: 0.35,
          lastAssessedAt: '2025-10-29T09:00:00Z',
        },
      ],
      weakStandardCount: 3,
      avgWeakMastery: 0.38,
      lastAssessmentAgeDays: 11,
      score: 2.4,
      traceId: 'alert_abc123',
    },
    {
      studentId: 'student-2',
      studentName: 'Somchai Lee',
      avatarInitials: 'SL',
      alertSeverity: 'warning' as const,
      weakStandards: [
        {
          code: 'Sc2.1-G3',
          title: 'Identify living things',
          masteryLevel: 0.48,
          lastAssessedAt: '2025-11-01T09:00:00Z',
        },
        {
          code: 'Sc2.2-G3',
          title: 'Classify organisms',
          masteryLevel: 0.46,
          lastAssessedAt: '2025-11-02T09:00:00Z',
        },
      ],
      weakStandardCount: 2,
      avgWeakMastery: 0.47,
      lastAssessmentAgeDays: 5,
      score: 1.7,
      traceId: 'alert_def456',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no classes are provided', () => {
    const { container } = render(
      <InterventionAlertsWidget initialClassId="" classes={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders loading state on initial load', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    expect(screen.getByRole('heading', { name: /intervention alerts/i })).toBeInTheDocument();
    // Check for skeleton loaders
    const skeletons = screen.getAllByRole('generic').filter((el) =>
      el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('fetches and displays alerts successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: mockAlerts,
        nextCursor: null,
        totalAlerts: 2,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Anan Prasert')).toBeInTheDocument();
    });

    expect(screen.getByText('Somchai Lee')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('displays empty state when no alerts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: [],
        nextCursor: null,
        totalAlerts: 0,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Great news! All students are on track/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /review class analytics/i })).toBeInTheDocument();
  });

  it('displays error state on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(
        screen.getByRole('alert')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Unable to load intervention alerts/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('handles 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Session expired. Please sign in again/i)
    ).toBeInTheDocument();
  });

  it('handles 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/You don't have access to this class/i)
    ).toBeInTheDocument();
  });

  it('allows manual refresh', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          classId: 'class-1',
          generatedAt: new Date().toISOString(),
          alerts: mockAlerts.slice(0, 1),
          nextCursor: null,
          totalAlerts: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          classId: 'class-1',
          generatedAt: new Date().toISOString(),
          alerts: mockAlerts,
          nextCursor: null,
          totalAlerts: 2,
        }),
      });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Anan Prasert')).toBeInTheDocument();
    });

    expect(screen.queryByText('Somchai Lee')).not.toBeInTheDocument();

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Somchai Lee')).toBeInTheDocument();
    });

    // Verify refresh=true was passed
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const lastCallUrl = mockFetch.mock.calls[1][0];
    expect(lastCallUrl).toContain('refresh=true');
  });

  it('allows class selection change', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          classId: 'class-1',
          generatedAt: new Date().toISOString(),
          alerts: mockAlerts,
          nextCursor: null,
          totalAlerts: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          classId: 'class-2',
          generatedAt: new Date().toISOString(),
          alerts: [],
          nextCursor: null,
          totalAlerts: 0,
        }),
      });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Anan Prasert')).toBeInTheDocument();
    });

    // Change class selection
    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    const class2Option = await screen.findByText('Grade 3B');
    fireEvent.click(class2Option);

    await waitFor(() => {
      expect(
        screen.getByText(/Great news! All students are on track/i)
      ).toBeInTheDocument();
    });

    // Verify the new class was fetched
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondCallUrl = mockFetch.mock.calls[1][0];
    expect(secondCallUrl).toContain('class-2');
  });

  it('displays alert severity badges correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: mockAlerts,
        nextCursor: null,
        totalAlerts: 2,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('displays weak standards with truncation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: mockAlerts,
        nextCursor: null,
        totalAlerts: 2,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Sc1.1-G3/)).toBeInTheDocument();
    });

    // First alert should show first 2 standards and +1 more
    expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
  });

  it('makes alert rows clickable with correct href', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: [mockAlerts[0]],
        nextCursor: null,
        totalAlerts: 1,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Anan Prasert')).toBeInTheDocument();
    });

    const link = screen.getByRole('button', { name: /anan prasert/i }).closest('a');
    expect(link).toHaveAttribute(
      'href',
      '/teacher/classes/class-1/students/student-1/analytics?from=intervention-widget'
    );
  });

  it('respects display limit and shows view all link', async () => {
    const manyAlerts = Array.from({ length: 10 }, (_, i) => ({
      ...mockAlerts[0],
      studentId: `student-${i}`,
      studentName: `Student ${i}`,
      avatarInitials: `S${i}`,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classId: 'class-1',
        generatedAt: new Date().toISOString(),
        alerts: manyAlerts.slice(0, 5),
        nextCursor: 'cursor-5',
        totalAlerts: 10,
      }),
    });

    render(
      <InterventionAlertsWidget initialClassId="class-1" classes={mockClasses} />
    );

    await waitFor(() => {
      expect(screen.getByText('Student 0')).toBeInTheDocument();
    });

    // Should show view all link with count
    expect(screen.getByText(/view all alerts/i)).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });
});
