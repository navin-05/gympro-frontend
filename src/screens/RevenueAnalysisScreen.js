import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Colors from '../theme/colors';
import apiClient from '../api/client';

const screenWidth = Dimensions.get('window').width - 40;
const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString('en-IN')}`;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const chartConfig = {
  backgroundGradientFrom: Colors.card,
  backgroundGradientTo: Colors.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 206, 209, ${opacity})`,
  labelColor: () => Colors.textSecondary,
  propsForBackgroundLines: {
    stroke: Colors.border,
    strokeDasharray: '4 4',
  },
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: Colors.primary,
  },
  fillShadowGradientFrom: Colors.primary,
  fillShadowGradientTo: 'transparent',
  fillShadowGradientFromOpacity: 0.3,
  fillShadowGradientToOpacity: 0,
  style: { borderRadius: 16 },
};

const PIE_COLORS = ['#00CED1', '#FF6B6B', '#FFD93D', '#6BCB77', '#9B59B6', '#3498DB'];

const RevenueAnalysisScreen = ({ navigation }) => {
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);

  // Month picker state
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  useEffect(() => { loadData(now.getMonth(), now.getFullYear()); }, []);

  const loadData = async (month, year) => {
    try {
      const params = {};
      if (month !== undefined && year !== undefined) {
        params.month = month;
        params.year = year;
      }
      const [dashRes, membersRes] = await Promise.all([
        apiClient.get('/dashboard', { params }),
        apiClient.get('/members', { params: { mode: 'analytics' } }),
      ]);
      console.log('[Revenue] Dashboard payload:', dashRes.data);
      console.log('[Revenue] Members rows:', membersRes.data?.length || 0);
      setStats(dashRes.data || {});
      setMembers(membersRes.data || []);
    } catch (err) {
      console.log('[Revenue] Load error:', err.message);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(selectedMonth, selectedYear);
    setRefreshing(false);
  };

  const handleMonthSelect = (month) => {
    // Don't allow future months
    if (pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && month > now.getMonth())) return;
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    setPickerVisible(false);
    setLoading(true);
    loadData(month, pickerYear);
  };

  const isCurrentMonthSelected = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const monthLabel = `${MONTH_FULL[selectedMonth]} ${selectedYear}`;

  // ═════════════════════════════════════════════════════
  // ─── FILTER MEMBERS BY SELECTED MONTH ──────────────
  // ═════════════════════════════════════════════════════
  const monthStart = new Date(selectedYear, selectedMonth, 1);
  const monthEnd = new Date(selectedYear, selectedMonth + 1, 1);
  const filteredMembers = members.filter(m => {
    const date = new Date(m.startDate || m.createdAt);
    return date >= monthStart && date < monthEnd;
  });

  // ═════════════════════════════════════════════════════
  // ─── DATA TRANSFORMATIONS ──────────────────────────
  // ═════════════════════════════════════════════════════

  // Totals
  const totalCollected = Number(stats?.revenueThisMonth || 0);
  const totalPending = filteredMembers.reduce((s, m) => s + (m.dueAmount || 0), 0);
  const totalRevenue = totalCollected + totalPending;
  const paidMembers = filteredMembers.filter(m => (m.dueAmount || 0) === 0).length;
  const pendingMembers = filteredMembers.filter(m => (m.dueAmount || 0) > 0).length;

  // ─── LINE CHART: Revenue over time (daily within selected month) ────────
  const buildDailyRevenue = () => {
    // Calculate days in the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    // For current month, only show up to today
    const maxDay = isCurrentMonthSelected ? now.getDate() : daysInMonth;

    // Build a day → revenue map for the selected month
    const dayMap = {};
    for (let i = 1; i <= maxDay; i++) {
      const d = new Date(selectedYear, selectedMonth, i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    filteredMembers.forEach(m => {
      const dateKey = m.startDate
        ? new Date(m.startDate).toISOString().split('T')[0]
        : m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : null;
      if (dateKey && dayMap[dateKey] !== undefined) {
        dayMap[dateKey] += (m.paidAmount || 0);
      }
    });

    const entries = Object.entries(dayMap);

    // Show fewer labels to avoid overlap
    const step = Math.max(1, Math.floor(entries.length / 6));
    const labels = entries.map(([key], i) => {
      if (i % step === 0) {
        const d = new Date(key);
        return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
      }
      return '';
    });
    const data = entries.map(([, v]) => v);

    // Ensure at least one non-zero for chart rendering
    if (data.every(v => v === 0)) data[data.length - 1] = 0.01;

    return { labels, datasets: [{ data, strokeWidth: 2 }] };
  };

  // ─── BAR CHART: Revenue by Plan ───────────────────
  const buildPlanRevenue = () => {
    const planMap = {};
    filteredMembers.forEach(m => {
      const name = m.planName || 'Other';
      if (!planMap[name]) planMap[name] = 0;
      planMap[name] += (m.paidAmount || 0);
    });
    const entries = Object.entries(planMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return { labels: ['No Data'], datasets: [{ data: [0] }] };
    return {
      labels: entries.map(([name]) => name.length > 8 ? name.substring(0, 7) + '…' : name),
      datasets: [{ data: entries.map(([, v]) => v || 0.01) }],
    };
  };

  // ─── PIE CHART: Payment Status ────────────────────
  const buildPieData = () => {
    const data = [];
    if (paidMembers > 0) {
      data.push({
        name: 'Paid',
        population: paidMembers,
        color: '#00CED1',
        legendFontColor: Colors.textSecondary,
        legendFontSize: 13,
      });
    }
    if (pendingMembers > 0) {
      data.push({
        name: 'Pending',
        population: pendingMembers,
        color: '#FF6B6B',
        legendFontColor: Colors.textSecondary,
        legendFontSize: 13,
      });
    }
    if (data.length === 0) {
      data.push({
        name: 'No Data',
        population: 1,
        color: Colors.border,
        legendFontColor: Colors.textMuted,
        legendFontSize: 13,
      });
    }
    return data;
  };

  // ─── PIE CHART: Revenue by Plan ───────────────────
  const buildPlanPieData = () => {
    const planMap = {};
    filteredMembers.forEach(m => {
      const name = m.planName || 'Other';
      if (!planMap[name]) planMap[name] = 0;
      planMap[name] += (m.paidAmount || 0);
    });
    const entries = Object.entries(planMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return [{ name: 'No Data', population: 1, color: Colors.border, legendFontColor: Colors.textMuted, legendFontSize: 13 }];
    }
    return entries.map(([name, value], i) => ({
      name,
      population: value || 1,
      color: PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: Colors.textSecondary,
      legendFontSize: 13,
    }));
  };

  const lineData = buildDailyRevenue();
  const barData = buildPlanRevenue();
  const pieData = buildPieData();
  const planPieData = buildPlanPieData();

  // ─── Plan breakdown table ─────────────────────────
  const planBreakdown = {};
  filteredMembers.forEach(m => {
    const name = m.planName || 'Other';
    if (!planBreakdown[name]) planBreakdown[name] = { count: 0, collected: 0, due: 0 };
    planBreakdown[name].count++;
    planBreakdown[name].collected += (m.paidAmount || 0);
    planBreakdown[name].due += (m.dueAmount || 0);
  });
  const planRows = Object.entries(planBreakdown).sort((a, b) => b[1].collected - a[1].collected);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* ─── Header ───────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Revenue Analysis</Text>
          <Text style={styles.headerSubtitle}>{monthLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => { setPickerYear(selectedYear); setPickerVisible(true); }} style={styles.backBtn}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─── Summary Cards ──────────────────────── */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.primary }]}>
          <Ionicons name="trending-up" size={20} color={Colors.primary} />
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{formatCurrency(totalRevenue)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.active }]}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.active} />
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: Colors.active }]}>{formatCurrency(totalCollected)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.expired }]}>
          <Ionicons name="alert-circle" size={20} color={Colors.expired} />
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: Colors.expired }]}>{formatCurrency(totalPending)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.secondary }]}>
          <Ionicons name="receipt" size={20} color={Colors.secondary} />
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{filteredMembers.length}</Text>
        </View>
      </View>

      {/* ─── Collection Progress ────────────────── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Collection Progress</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressPercent}>
            {totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0}%
          </Text>
          <Text style={styles.progressSubtext}>of total revenue collected</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0}%` }]} />
        </View>
        <View style={styles.progressLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.active }]} />
            <Text style={styles.legendText}>Collected {formatCurrency(totalCollected)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.expired }]} />
            <Text style={styles.legendText}>Pending {formatCurrency(totalPending)}</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── CHART 1: Revenue Over Time (Line) ──── */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Revenue</Text>
        <LineChart
          data={lineData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            ...chartConfig,
            backgroundGradientFrom: Colors.card,
            backgroundGradientTo: Colors.card,
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero
          yAxisLabel="₹"
          segments={4}
        />
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── CHART 2: Revenue by Plan (Bar) ─────── */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue by Plan</Text>
        <BarChart
          data={barData}
          width={screenWidth - 32}
          height={240}
          chartConfig={{
            ...chartConfig,
            backgroundGradientFrom: Colors.card,
            backgroundGradientTo: Colors.card,
            barPercentage: 0.6,
            color: (opacity = 1) => `rgba(0, 206, 209, ${opacity})`,
            fillShadowGradientFrom: Colors.primary,
            fillShadowGradientTo: Colors.primary,
            fillShadowGradientFromOpacity: 1,
            fillShadowGradientToOpacity: 0.6,
          }}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          yAxisLabel="₹"
          withInnerLines={true}
        />
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── CHART 3: Payment Status (Pie) ──────── */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Payment Status</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 32}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          absolute={false}
          hasLegend={true}
          style={styles.chart}
        />
        {/* Insight boxes */}
        <View style={styles.insightRow}>
          <View style={[styles.insightBox, { backgroundColor: '#00CED120' }]}>
            <Text style={[styles.insightNum, { color: '#00CED1' }]}>{paidMembers}</Text>
            <Text style={styles.insightLabel}>Fully Paid</Text>
          </View>
          <View style={[styles.insightBox, { backgroundColor: '#FF6B6B20' }]}>
            <Text style={[styles.insightNum, { color: '#FF6B6B' }]}>{pendingMembers}</Text>
            <Text style={styles.insightLabel}>Pending</Text>
          </View>
          <View style={[styles.insightBox, { backgroundColor: Colors.primaryGlow }]}>
            <Text style={[styles.insightNum, { color: Colors.primary }]}>{filteredMembers.length}</Text>
            <Text style={styles.insightLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── CHART 4: Revenue Share by Plan (Pie) ─ */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Revenue Share by Plan</Text>
        <PieChart
          data={planPieData}
          width={screenWidth - 32}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          absolute={false}
          hasLegend={true}
          style={styles.chart}
        />
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Plan Breakdown Table ─────────────────  */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Plan Breakdown</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Plan</Text>
          <Text style={styles.th}>Count</Text>
          <Text style={styles.th}>Collected</Text>
          <Text style={styles.th}>Due</Text>
        </View>
        {planRows.map(([name, data]) => (
          <View key={name} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>{name}</Text>
            <Text style={styles.td}>{data.count}</Text>
            <Text style={[styles.td, { color: Colors.active }]}>{formatCurrency(data.collected)}</Text>
            <Text style={[styles.td, { color: data.due > 0 ? Colors.expired : Colors.textMuted }]}>
              {formatCurrency(data.due)}
            </Text>
          </View>
        ))}
        {planRows.length === 0 && (
          <Text style={styles.emptyText}>No plan data available</Text>
        )}
        {/* Totals row */}
        {planRows.length > 0 && (
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.td, { flex: 2, fontWeight: '700', color: Colors.text }]}>Total</Text>
            <Text style={[styles.td, { fontWeight: '700', color: Colors.text }]}>{filteredMembers.length}</Text>
            <Text style={[styles.td, { fontWeight: '700', color: Colors.active }]}>{formatCurrency(totalCollected)}</Text>
            <Text style={[styles.td, { fontWeight: '700', color: Colors.expired }]}>{formatCurrency(totalPending)}</Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Recent Payments List ─────────────────  */}
      {/* ═══════════════════════════════════════════ */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Recent Payments</Text>
        {[...filteredMembers]
          .filter(m => m.paidAmount > 0)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 8)
          .map((m, i, arr) => {
            const date = m.updatedAt || m.createdAt;
            return (
              <View key={m._id || i} style={[styles.recentRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.recentAvatar}>
                  <Text style={styles.recentAvatarText}>{m.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.recentSub}>{m.planName} · {date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recentAmt}>{formatCurrency(m.paidAmount)}</Text>
                  {m.dueAmount > 0 && <Text style={styles.recentDue}>₹{m.dueAmount} due</Text>}
                </View>
              </View>
            );
          })}
        {filteredMembers.filter(m => m.paidAmount > 0).length === 0 && (
          <Text style={styles.emptyText}>No payments recorded</Text>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* ═══ Month Picker Modal ═══ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerContainer}>
            {/* Year Navigation */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => { if (pickerYear < now.getFullYear()) setPickerYear(y => y + 1); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={pickerYear >= now.getFullYear()}
              >
                <Ionicons name="chevron-forward" size={22} color={pickerYear >= now.getFullYear() ? Colors.textMuted : Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, idx) => {
                const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && idx > now.getMonth());
                const isSelected = idx === selectedMonth && pickerYear === selectedYear;
                const isCurrent = idx === now.getMonth() && pickerYear === now.getFullYear();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.monthCell,
                      isSelected && styles.monthCellSelected,
                      isCurrent && !isSelected && styles.monthCellCurrent,
                      isFuture && styles.monthCellDisabled,
                    ]}
                    onPress={() => handleMonthSelect(idx)}
                    disabled={isFuture}
                  >
                    <Text style={[
                      styles.monthCellText,
                      isSelected && styles.monthCellTextSelected,
                      isCurrent && !isSelected && styles.monthCellTextCurrent,
                      isFuture && styles.monthCellTextDisabled,
                    ]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.primary, fontWeight: '500', marginTop: 2 },

  // Summary
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  summaryCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14, width: '48%', marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4,
  },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },

  // Chart card wrapper
  chartCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  chartTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -8 },

  // Time range toggle
  timeToggle: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 8, padding: 2 },
  timeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  timeBtnActive: { backgroundColor: Colors.primary },
  timeBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  timeBtnTextActive: { color: Colors.background },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  progressPercent: { fontSize: 32, fontWeight: '700', color: Colors.active },
  progressSubtext: { fontSize: 13, color: Colors.textSecondary },
  progressBar: { height: 14, backgroundColor: Colors.expired + '25', borderRadius: 7, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.active, borderRadius: 7 },
  progressLegend: { flexDirection: 'row', marginTop: 12, gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: Colors.textSecondary },

  // Insights
  insightRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  insightBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  insightNum: { fontSize: 22, fontWeight: '700' },
  insightLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Table
  tableHeader: {
    flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4,
  },
  th: { flex: 1, fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  totalRow: {
    borderTopWidth: 2, borderTopColor: Colors.primary + '40', borderBottomWidth: 0, marginTop: 4,
  },
  td: { flex: 1, fontSize: 13, color: Colors.text },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  recentAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryGlow,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  recentAvatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  recentName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  recentSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  recentAmt: { fontSize: 14, fontWeight: '700', color: Colors.active },
  recentDue: { fontSize: 11, color: Colors.expired, marginTop: 2 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  // Month Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerYearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  pickerYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  monthCellSelected: {
    backgroundColor: Colors.primary,
  },
  monthCellCurrent: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  monthCellDisabled: {
    opacity: 0.3,
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  monthCellTextSelected: {
    color: Colors.background,
    fontWeight: '700',
  },
  monthCellTextCurrent: {
    color: Colors.primary,
  },
  monthCellTextDisabled: {
    color: Colors.textMuted,
  },
});

export default RevenueAnalysisScreen;
