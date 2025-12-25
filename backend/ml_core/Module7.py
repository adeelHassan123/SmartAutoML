# Module 7: Auto-Generated Final Report
# Dataset overview
# EDA results
# Issues detected
# Preprocessing decisions
# Model settings and hyperparameters
# Comparison tables
# Best model explanation
# Export as PDF/Markdown


"""Module 7: Auto-Generated Final Report.

Implements comprehensive Markdown and PDF exports with user-friendly formatting.
"""

from __future__ import annotations

import io
import json
from typing import Any, Dict, List
from datetime import datetime

import pandas as pd
import numpy as np

def _format_number(value, decimals=4):
    """Format numbers for display."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"
    if isinstance(value, (int, float)):
        if decimals == 0:
            return f"{value:.0f}"
        elif decimals == 1:
            return f"{value:.1f}"
        elif decimals == 2:
            return f"{value:.2f}"
        else:
            return f"{value:.4f}"
    return str(value)

def _format_percentage(value):
    """Format values as percentages."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"
    if isinstance(value, (int, float)):
        return f"{value:.1%}"
    return str(value)

def _create_dataset_overview_section(df: pd.DataFrame) -> str:
    """Create a readable dataset overview section."""
    lines = []

    lines.append("## 📊 Dataset Overview\n")

    # Basic statistics
    lines.append(f"**Dataset Size:** {df.shape[0]:,} rows × {df.shape[1]} columns\n")

    # Data types summary
    dtype_counts = df.dtypes.value_counts()
    lines.append("**Data Types:**")
    lines.append("| Type | Count |")
    lines.append("|------|-------|")
    for dtype, count in dtype_counts.items():
        lines.append(f"| {dtype} | {count} |")
    lines.append("")

    # Missing values summary
    missing_counts = df.isnull().sum()
    total_missing = missing_counts.sum()
    if total_missing > 0:
        lines.append(f"**Missing Values:** {total_missing:,} total ({total_missing/len(df):.1%} of all data)\n")
        lines.append("**Columns with Missing Data:**")
        missing_cols = missing_counts[missing_counts > 0].sort_values(ascending=False)
        lines.append("| Column | Missing | Percentage |")
        lines.append("|--------|---------|------------|")
        for col, count in missing_cols.head(10).items():  # Show top 10
            lines.append(f"| {col} | {count:,} | {_format_percentage(count/len(df))} |")
        if len(missing_cols) > 10:
            lines.append(f"| ... and {len(missing_cols)-10} more | | |")
        lines.append("")
    else:
        lines.append("**Missing Values:** None detected ✅\n")

    # Numerical columns summary
    num_cols = df.select_dtypes(include=[np.number]).columns
    if len(num_cols) > 0:
        lines.append("### 📈 Numerical Features Summary\n")
        desc = df[num_cols].describe()
        lines.append("| Statistic | " + " | ".join([f"{col}" for col in num_cols]) + " |")
        lines.append("|-----------|" + "|".join(["---" for _ in num_cols]) + "|")
        for stat in ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max']:
            if stat in desc.index:
                values = [_format_number(desc.loc[stat, col], 2) for col in num_cols]
                lines.append(f"| {stat.title()} | " + " | ".join(values) + " |")
        lines.append("")

    # Categorical columns summary
    cat_cols = df.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        lines.append("### 🏷️ Categorical Features Summary\n")
        for col in cat_cols[:5]:  # Show first 5 categorical columns
            value_counts = df[col].value_counts().head(5)
            lines.append(f"**{col}:** {len(value_counts)} unique values")
            lines.append("| Value | Count | Percentage |")
            lines.append("|-------|-------|------------|")
            for val, count in value_counts.items():
                lines.append(f"| {str(val)[:30]}{'...' if len(str(val)) > 30 else ''} | {count:,} | {_format_percentage(count/len(df))} |")
            lines.append("")

    return "\n".join(lines)

def _create_eda_section(eda_data: Dict[str, Any]) -> str:
    """Create EDA insights section."""
    lines = []

    lines.append("## 🔍 Exploratory Data Analysis\n")

    if not eda_data:
        lines.append("*No EDA data available*\n")
        return "\n".join(lines)

    # Missing values analysis
    if 'missing' in eda_data and eda_data['missing']:
        lines.append("### Missing Values Analysis\n")
        lines.append("Columns with significant missing data that may require attention:\n\n")

        missing_items = eda_data['missing']
        if isinstance(missing_items, dict):
            # Sort by missing percentage
            sorted_missing = sorted(missing_items.items(),
                                   key=lambda x: x[1].get('missing_percentage', 0),
                                   reverse=True)
            if sorted_missing:
                lines.append("| Column | Missing Count | Missing % |")
                lines.append("|--------|---------------|-----------|")
                for col, data in sorted_missing[:10]:  # Top 10
                    count = data.get('missing_count', 0)
                    pct = data.get('missing_percentage', 0)
                    lines.append(f"| {col} | {count:,} | {_format_percentage(pct/100)} |")
                lines.append("")

    # Correlation insights
    if 'correlation' in eda_data and eda_data['correlation']:
        lines.append("### Feature Correlations\n")
        corr_data = eda_data['correlation']
        if isinstance(corr_data, dict) and 'strong_correlations' in corr_data:
            strong_corr = corr_data['strong_correlations']
            if strong_corr:
                lines.append("Strong correlations (|ρ| > 0.7) between features:\n\n")
                lines.append("| Feature 1 | Feature 2 | Correlation |")
                lines.append("|-----------|-----------|-------------|")
                for item in strong_corr[:10]:  # Top 10
                    if isinstance(item, dict):
                        col1 = item.get('feature1', 'N/A')
                        col2 = item.get('feature2', 'N/A')
                        corr = item.get('correlation', 0)
                        lines.append(f"| {col1} | {col2} | {_format_number(corr, 3)} |")
                lines.append("")

    # Outliers
    if 'outliers_iqr' in eda_data and eda_data['outliers_iqr']:
        lines.append("### Outlier Detection (IQR Method)\n")
        outliers = eda_data['outliers_iqr']
        if outliers:
            lines.append(f"Detected {len(outliers)} features with potential outliers:\n\n")
            for outlier in outliers[:5]:  # Show top 5
                if isinstance(outlier, dict):
                    col = outlier.get('column', 'N/A')
                    count = outlier.get('outlier_count', 0)
                    pct = outlier.get('outlier_percentage', 0)
                    lines.append(f"- **{col}:** {count:,} outliers ({_format_percentage(pct/100)})")
            lines.append("")

    return "\n".join(lines)

def _create_issues_section(issues_data: Dict[str, Any]) -> str:
    """Create data quality issues section."""
    lines = []

    lines.append("## ⚠️ Data Quality Issues\n")

    if not issues_data or not issues_data.get('issues'):
        lines.append("✅ No significant data quality issues detected.\n")
        return "\n".join(lines)

    issues = issues_data.get('issues', [])
    if isinstance(issues, list):
        for issue in issues:
            if isinstance(issue, dict):
                issue_type = issue.get('type', 'Unknown')
                severity = issue.get('severity', 'medium')
                description = issue.get('description', 'No description')

                severity_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(severity, '🟡')
                lines.append(f"### {severity_emoji} {issue_type.replace('_', ' ').title()}\n")
                lines.append(f"{description}\n")

                # Add recommendations if available
                if 'recommendations' in issue and issue['recommendations']:
                    lines.append("**Recommendations:**")
                    for rec in issue['recommendations']:
                        lines.append(f"- {rec}")
                    lines.append("")

    return "\n".join(lines)

def _create_preprocessing_section(preprocess_data: Dict[str, Any]) -> str:
    """Create preprocessing decisions section."""
    lines = []

    lines.append("## 🔧 Preprocessing Applied\n")

    if not preprocess_data:
        lines.append("*No preprocessing data available*\n")
        return "\n".join(lines)

    # Handle different preprocessing data formats
    if 'steps' in preprocess_data:
        steps = preprocess_data['steps']
        if isinstance(steps, list):
            for i, step in enumerate(steps, 1):
                if isinstance(step, dict):
                    step_name = step.get('name', f'Step {i}')
                    description = step.get('description', 'No description')
                    lines.append(f"### {i}. {step_name}\n")
                    lines.append(f"{description}\n")

                    if 'details' in step and step['details']:
                        lines.append("**Details:**")
                        details = step['details']
                        if isinstance(details, dict):
                            for key, value in details.items():
                                lines.append(f"- {key}: {value}")
                        lines.append("")

    elif 'config' in preprocess_data:
        config = preprocess_data['config']
        if isinstance(config, dict):
            lines.append("Applied preprocessing configuration:\n")
            for key, value in config.items():
                lines.append(f"- **{key.replace('_', ' ').title()}:** {value}")
            lines.append("")

    return "\n".join(lines)

def _create_model_comparison_section(results_data: Dict[str, Any]) -> str:
    """Create model comparison section."""
    lines = []

    lines.append("## 🤖 Model Performance Comparison\n")

    if not results_data or 'comparison' not in results_data:
        lines.append("*No model comparison data available*\n")
        return "\n".join(lines)

    comparison = results_data.get('comparison', [])
    if not comparison:
        lines.append("*No model results to compare*\n")
        return "\n".join(lines)

    # Convert to DataFrame for easier manipulation
    if isinstance(comparison, list):
        df = pd.DataFrame(comparison)
    else:
        df = pd.DataFrame()

    if df.empty:
        lines.append("*No valid comparison data*\n")
        return "\n".join(lines)

    lines.append(f"Compared {len(df)} different machine learning models:\n\n")

    # Performance metrics table
    key_metrics = ['Model', 'accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'training_time']
    available_metrics = [col for col in key_metrics if col in df.columns]

    if available_metrics:
        lines.append("| " + " | ".join([col.replace('_', ' ').title() for col in available_metrics]) + " |")
        lines.append("|-" + "-|-".join(["-" * len(col.replace('_', ' ').title()) for col in available_metrics]) + "-|")

        for _, row in df.iterrows():
            formatted_values = []
            for col in available_metrics:
                value = row[col]
                if col == 'Model':
                    formatted_values.append(str(value))
                elif col in ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']:
                    formatted_values.append(_format_percentage(value) if pd.notna(value) else 'N/A')
                elif col == 'training_time':
                    formatted_values.append(_format_number(value, 2) + 's' if pd.notna(value) else 'N/A')
                else:
                    formatted_values.append(_format_number(value, 4) if pd.notna(value) else 'N/A')
            lines.append("| " + " | ".join(formatted_values) + " |")
        lines.append("")

    # Best models section
    if 'best_3_models' in results_data and results_data['best_3_models']:
        lines.append("### 🏆 Top Performing Models\n")
        best_models = results_data['best_3_models']

        for i, model in enumerate(best_models[:3], 1):
            if isinstance(model, dict):
                model_name = model.get('model', 'Unknown')
                accuracy = model.get('accuracy', 0)
                reasons = model.get('reasons', [])

                medal = ['🥇', '🥈', '🥉'][i-1] if i <= 3 else f'#{i}'

                lines.append(f"#### {medal} {model_name}\n")
                lines.append(f"**Accuracy:** {_format_percentage(accuracy)}\n")

                if reasons:
                    lines.append("**Why this model performed well:**")
                    for reason in reasons:
                        lines.append(f"- {reason}")
                    lines.append("")

                # Show key metrics
                metrics_to_show = ['f1_score', 'roc_auc', 'training_time']
                metrics_text = []
                for metric in metrics_to_show:
                    value = model.get(metric)
                    if value is not None:
                        if metric == 'training_time':
                            metrics_text.append(f"{metric.replace('_', ' ').title()}: {_format_number(value, 2)}s")
                        else:
                            metrics_text.append(f"{metric.replace('_', ' ').title()}: {_format_number(value, 4)}")

                if metrics_text:
                    lines.append("**Key Metrics:** " + ", ".join(metrics_text) + "\n")

    return "\n".join(lines)

def _create_model_ranking_section(results_data: Dict[str, Any]) -> str:
    """Create model ranking section."""
    lines = []

    lines.append("## 📊 Model Ranking\n")

    if not results_data or 'ranked' not in results_data:
        lines.append("*No ranking data available*\n")
        return "\n".join(lines)

    ranked = results_data.get('ranked', [])
    if not ranked:
        lines.append("*No ranking results*\n")
        return "\n".join(lines)

    lines.append("Models ranked by performance (higher scores are better):\n\n")
    lines.append("| Rank | Model | Score |")
    lines.append("|------|-------|-------|")

    for item in ranked:
        if isinstance(item, dict):
            rank = item.get('Rank', 'N/A')
            model = item.get('Model', 'Unknown')
            score = item.get('Score', 0)

            # Add medal for top 3
            medal = ""
            if rank == 1:
                medal = "🥇 "
            elif rank == 2:
                medal = "🥈 "
            elif rank == 3:
                medal = "🥉 "

            lines.append(f"| {rank} | {medal}{model} | {_format_percentage(score)} |")

    lines.append("")
    return "\n".join(lines)

def _create_recommendations_section(results_data: Dict[str, Any]) -> str:
    """Create recommendations section."""
    lines = []

    lines.append("## 💡 Recommendations\n")

    if not results_data or 'best_3_models' not in results_data:
        lines.append("*Limited data available for recommendations*\n")
        return "\n".join(lines)

    best_models = results_data.get('best_3_models', [])
    if not best_models:
        lines.append("*No model recommendations available*\n")
        return "\n".join(lines)

    top_model = best_models[0] if best_models else None
    if top_model and isinstance(top_model, dict):
        model_name = top_model.get('model', 'Unknown')
        accuracy = top_model.get('accuracy', 0)

        lines.append("### 🎯 Recommended Model\n")
        lines.append(f"**{model_name}** with {_format_percentage(accuracy)} accuracy\n")
        lines.append("This model showed the best balance of performance, stability, and efficiency.\n")

        # Usage recommendations
        lines.append("### 📋 Next Steps\n")
        lines.append("1. **Deploy the recommended model** for production use")
        lines.append("2. **Monitor performance** on new data regularly")
        lines.append("3. **Consider retraining** if data patterns change significantly")
        lines.append("4. **Validate predictions** on a holdout test set before deployment")
        lines.append("")

    return "\n".join(lines)

def _create_summary_section(report_data: Dict[str, Any]) -> str:
    """Create executive summary section."""
    lines = []

    lines.append("# 📋 AutoML Analysis Summary\n")
    lines.append(f"*Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")

    # Dataset summary
    dataset_info = report_data.get('dataset', {})
    if dataset_info:
        lines.append("## Dataset Summary\n")
        if isinstance(dataset_info, dict):
            shape = dataset_info.get('shape', 'Unknown')
            lines.append(f"- **Size:** {shape}\n")
        lines.append("")

    # Model performance summary
    results_data = report_data.get('results', {})
    if results_data and 'best_3_models' in results_data:
        best_models = results_data['best_3_models']
        if best_models and len(best_models) > 0:
            top_model = best_models[0]
            if isinstance(top_model, dict):
                model_name = top_model.get('model', 'Unknown')
                accuracy = top_model.get('accuracy', 0)

                lines.append("## Best Model Performance\n")
                lines.append(f"- **Top Model:** {model_name}")
                lines.append(f"- **Accuracy:** {_format_percentage(accuracy)}")
                lines.append(f"- **Models Evaluated:** {len(results_data.get('comparison', []))}")
                lines.append("")

    return "\n".join(lines)


def build_comprehensive_markdown_report(report_data: Dict[str, Any]) -> str:
    """Build a comprehensive, user-friendly markdown report."""
    parts = []

    # Executive Summary
    parts.append(_create_summary_section(report_data))

    # Dataset Overview
    if 'dataset' in report_data and report_data['dataset']:
        df = report_data['dataset'].get('dataframe')
        if df is not None:
            parts.append(_create_dataset_overview_section(df))

    # EDA Insights
    if 'eda' in report_data:
        parts.append(_create_eda_section(report_data['eda']))

    # Data Quality Issues
    if 'issues' in report_data:
        parts.append(_create_issues_section(report_data['issues']))

    # Preprocessing
    if 'preprocessing' in report_data:
        parts.append(_create_preprocessing_section(report_data['preprocessing']))

    # Model Results
    if 'results' in report_data:
        parts.append(_create_model_comparison_section(report_data['results']))
        parts.append(_create_model_ranking_section(report_data['results']))

    # Recommendations
    if 'results' in report_data:
        parts.append(_create_recommendations_section(report_data['results']))

    # Technical Details (for advanced users)
    if 'results' in report_data and 'detailed_metrics' in report_data['results']:
        detailed_metrics = report_data['results']['detailed_metrics']
        if detailed_metrics:
            parts.append("## 🔧 Technical Details\n")
            parts.append("### Detailed Model Metrics\n\n")
            parts.append("| Model | Accuracy | F1-Score | ROC-AUC | CV Mean | Training Time |")
            parts.append("|-------|----------|----------|---------|---------|---------------|")

            for metric in detailed_metrics:
                if isinstance(metric, dict):
                    model = metric.get('model', 'Unknown')
                    acc = _format_percentage(metric.get('accuracy'))
                    f1 = _format_number(metric.get('f1_score'), 4)
                    roc = _format_number(metric.get('roc_auc'), 4)
                    cv = _format_number(metric.get('cv_mean'), 4)
                    time_val = _format_number(metric.get('training_time'), 2) + 's'
                    parts.append(f"| {model} | {acc} | {f1} | {roc} | {cv} | {time_val} |")
            parts.append("")

    return "\n".join(parts).strip() + "\n"


def _to_markdown_block(value: Any) -> str:
    """Legacy function for backward compatibility."""
    if value is None:
        return ""
    if isinstance(value, pd.DataFrame):
        return value.to_markdown(index=False)
    # For nested structures, a JSON code block is the most robust.
    if isinstance(value, (dict, list, tuple)):
        try:
            return "```json\n" + json.dumps(value, indent=2, default=str) + "\n```"
        except Exception:
            return "```\n" + str(value) + "\n```"
    return str(value)


def build_markdown_report(report_sections: dict[str, Any], title: str = "AutoML Classification Report") -> str:
    """Legacy function for backward compatibility."""
    parts: list[str] = [f"# {title}", ""]
    for section_title, content in report_sections.items():
        parts.append(f"## {section_title}")
        parts.append(_to_markdown_block(content))
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def export_report_as_markdown_bytes(report_data: Dict[str, Any], title: str = "AutoML Analysis Report") -> bytes:
    """Export comprehensive report as markdown bytes."""
    md = build_comprehensive_markdown_report(report_data)
    buffer = io.BytesIO()
    buffer.write(md.encode("utf-8"))
    return buffer.getvalue()


def export_report_as_pdf_bytes(report_sections: dict[str, Any], title: str = "AutoML Classification Report") -> bytes:
    """Export report as PDF bytes.

    Uses fpdf2 (pure Python). If unavailable, raises RuntimeError with install hint.
    """

    try:
        from fpdf import FPDF  # type: ignore
    except Exception as e:
        import sys
        raise RuntimeError(f'PDF export requires fpdf2. Install it via `pip install fpdf2`. Details: {e}, Path: {sys.path}') from e

    md = build_markdown_report(report_sections, title=title)

    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    # Built-in font; avoids external font dependencies.
    pdf.set_font('Helvetica', size=10)

    effective_width = float(pdf.w - pdf.l_margin - pdf.r_margin)

    def _write_line(text: str) -> None:
        # fpdf2 can throw if it cannot render even a single character in the remaining width.
        pdf.set_x(pdf.l_margin)
        if text == "":
            pdf.ln(5)
            return
        try:
            pdf.multi_cell(effective_width, 5, text)
        except Exception:
            # Fallback: chunk long unbreakable lines.
            chunk_size = 80
            for i in range(0, len(text), chunk_size):
                pdf.set_x(pdf.l_margin)
                pdf.multi_cell(effective_width, 5, text[i:i + chunk_size])

    # Render markdown as plain text. (Minimum spec is exportability, not rich PDF formatting.)
    for line in md.splitlines():
        # fpdf core fonts are latin-1; replace unsupported chars.
        safe_line = line.encode('latin-1', errors='replace').decode('latin-1')
        _write_line(safe_line)

    out = pdf.output()
    if isinstance(out, (bytes, bytearray)):
        return bytes(out)
    return str(out).encode('latin-1') 