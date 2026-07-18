import { useMemo, useState } from 'react';
import { ArrowLeft, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCategoryConfig } from '../types';
import { getUniqueMonths } from '../utils';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import './Analytics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface AnalyticsProps {
  onBack: () => void;
}

export default function Analytics({ onBack }: AnalyticsProps) {
  const { state, convertToDisplay, formatCurrency } = useApp();
  
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    return getUniqueMonths(state.transactions);
  }, [state.transactions]);

  // Filtrar transacciones del mes
  const monthlyTransactions = useMemo(() => {
    return state.transactions.filter(t => t.date.startsWith(filterMonth));
  }, [state.transactions, filterMonth]);

  // Calcular totales
  const totalExpenses = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId))
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency), 0);
  }, [monthlyTransactions, convertToDisplay]);

  const totalIncome = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency), 0);
  }, [monthlyTransactions, convertToDisplay]);

  // Obtener mes anterior para comparación MoM
  const prevMonthString = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;
  }, [filterMonth]);

  const prevMonthlyTransactions = useMemo(() => {
    return state.transactions.filter(t => t.date.startsWith(prevMonthString));
  }, [state.transactions, prevMonthString]);

  const prevTotalExpenses = useMemo(() => {
    return prevMonthlyTransactions
      .filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId))
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency), 0);
  }, [prevMonthlyTransactions, convertToDisplay]);

  const prevTotalIncome = useMemo(() => {
    return prevMonthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + convertToDisplay(t.amount, t.currency), 0);
  }, [prevMonthlyTransactions, convertToDisplay]);

  const expensesMoM = useMemo(() => {
    if (prevTotalExpenses === 0) return null;
    return ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100;
  }, [totalExpenses, prevTotalExpenses]);

  const incomeMoM = useMemo(() => {
    if (prevTotalIncome === 0) return null;
    return ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
  }, [totalIncome, prevTotalIncome]);

  // Datos para Doughnut (Gastos por Categoría)
  const categoryData = useMemo(() => {
    const expenses = monthlyTransactions.filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId));
    const grouped: Record<string, number> = {};
    expenses.forEach(t => {
      const amount = convertToDisplay(t.amount, t.currency);
      grouped[t.category] = (grouped[t.category] || 0) + amount;
    });

    const sortedCats = Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]);
    
    return {
      labels: sortedCats.map(cat => getCategoryConfig(cat).label),
      datasets: [
        {
          data: sortedCats.map(cat => grouped[cat]),
          backgroundColor: sortedCats.map(cat => getCategoryConfig(cat).color),
          borderWidth: 0,
        },
      ],
      raw: sortedCats.map(cat => ({
        id: cat,
        config: getCategoryConfig(cat),
        amount: grouped[cat],
        percentage: totalExpenses > 0 ? (grouped[cat] / totalExpenses) * 100 : 0
      }))
    };
  }, [monthlyTransactions, convertToDisplay, totalExpenses]);

  const doughnutOptions = {
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: state.settings.displayCurrency }).format(context.parsed);
            }
            return label;
          }
        }
      }
    }
  };

  const dailyData = useMemo(() => {
    const expenses = monthlyTransactions.filter(t => t.type === 'expense' && !(t.paymentMethod === 'credit' && t.creditCardId));
    
    // Determine the number of days in the month
    const [year, month] = filterMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    const dailyTotals = Array(daysInMonth).fill(0);
    
    expenses.forEach(t => {
      // t.date format: YYYY-MM-DD
      const day = parseInt(t.date.split('-')[2], 10);
      const amount = convertToDisplay(t.amount, t.currency);
      dailyTotals[day - 1] += amount;
    });

    return {
      labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
      datasets: [
        {
          label: 'Gasto Diario',
          data: dailyTotals,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 4,
        }
      ]
    };
  }, [monthlyTransactions, convertToDisplay, filterMonth]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context: any) => `Día ${context[0].label}`,
          label: (context: any) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: state.settings.displayCurrency }).format(context.parsed.y)
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10 }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          callback: (value: any) => new Intl.NumberFormat('es-AR', { notation: "compact", compactDisplay: "short" }).format(value)
        }
      }
    }
  };

  const formatPercentage = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 100000) {
      return `${(val / 1000).toFixed(0)}k%`;
    }
    if (absVal >= 1000) {
      return `${(val / 1000).toFixed(1)}k%`;
    }
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return (
    <div className="analytics-page safe-area-bottom">
      <header className="analytics-page__header animate-slide-up">
        <button className="back-btn bounce-effect" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Análisis</h1>
      </header>

      <div className="analytics-page__content">
        <div className="month-selector-container animate-slide-up stagger-1">
          <select 
            className="month-filter--full bounce-effect"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            {monthOptions.length === 0 && <option value={filterMonth}>Este Mes</option>}
          </select>
        </div>

        <div className="analytics-summary animate-slide-up stagger-2">
          <div className="analytics-summary__card">
            <div className="analytics-summary__icon" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' }}>
              <TrendingUp size={20} />
            </div>
            <div className="analytics-summary__details">
              <p>Ingresos</p>
              <h4>{formatCurrency(totalIncome)}</h4>
              {incomeMoM !== null && (
                <span className={`mom-badge mom-badge--${incomeMoM >= 0 ? 'up' : 'down'}`}>
                  {incomeMoM >= 0 ? '▲ +' : '▼ '}{formatPercentage(incomeMoM)} vs mes ant.
                </span>
              )}
            </div>
          </div>
          <div className="analytics-summary__card">
            <div className="analytics-summary__icon" style={{ backgroundColor: 'rgba(248, 113, 113, 0.15)', color: '#f87171' }}>
              <TrendingDown size={20} />
            </div>
            <div className="analytics-summary__details">
              <p>Gastos</p>
              <h4>{formatCurrency(totalExpenses)}</h4>
              {expensesMoM !== null && (
                <span className={`mom-badge mom-badge--${expensesMoM <= 0 ? 'down-good' : 'up-bad'}`}>
                  {expensesMoM >= 0 ? '▲ +' : '▼ '}{formatPercentage(expensesMoM)} vs mes ant.
                </span>
              )}
            </div>
          </div>
        </div>

        <section className="analytics-section animate-slide-up stagger-3">
          <h3 className="section-title">
            <PieChart size={18} />
            Gastos por Categoría
          </h3>
          
          {totalExpenses > 0 ? (
            <>
              <div className="chart-container-doughnut">
                <Doughnut data={categoryData} options={doughnutOptions} />
                <div className="chart-center-text">
                  <span>Total Gastos</span>
                  <h3>{formatCurrency(totalExpenses)}</h3>
                </div>
              </div>

              <div className="category-list">
                {categoryData.raw.map((item) => (
                  <div key={item.id} className="category-list-item bounce-effect">
                    <div className="category-list-item__icon" style={{ backgroundColor: `${item.config.color}15` }}>
                      <span>{item.config.emoji}</span>
                    </div>
                    <div className="category-list-item__info">
                      <div className="category-list-item__header">
                        <span className="category-name">{item.config.label}</span>
                        <span className="category-amount">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="category-progress-bg">
                        <div 
                          className="category-progress-fill" 
                          style={{ 
                            width: `${item.percentage}%`, 
                            backgroundColor: item.config.color 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state__emoji">📊</span>
              <p>No hay gastos este mes</p>
            </div>
          )}
        </section>

        {totalExpenses > 0 && (
          <section className="analytics-section animate-slide-up stagger-4">
            <h3 className="section-title">
              <TrendingDown size={18} />
              Tendencia Diaria
            </h3>
            <div style={{ height: '240px', width: '100%' }}>
              <Bar data={dailyData} options={barOptions} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
