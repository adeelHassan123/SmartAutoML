import logging
from typing import Dict, Any
import json

import pandas as pd
import numpy as np

from .train_service import get_training_status, get_training_results
from ..ml_core.Module6 import show_comparison_table, rank_algorithms

logger = logging.getLogger(__name__)


def _convert_to_serializable(obj):
    """Convert numpy and pandas types to JSON-serializable types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    elif isinstance(obj, dict):
        return {k: _convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_convert_to_serializable(item) for item in obj]
    elif pd.isna(obj):
        return None
    return obj


def _format_best_params(params):
    """Convert best_params dict to readable string for display."""
    if params is None or not params:
        return "None"
    if isinstance(params, dict):
        # Convert dict to readable JSON string
        try:
            return json.dumps(params)
        except:
            return str(params)
    return str(params)


def get_model_results(dataset_id: str, version: str = None) -> Dict[str, Any]:
    """Get model comparison and ranking results."""
    status = get_training_status(dataset_id)
    if status != 'done':
        return {'status': status}

    training_data = get_training_results(dataset_id, version)
    if not training_data:
        return {'status': 'no_results'}

    # training_data['results'] contains the stored result dict with 'results' and 'evaluation' keys
    result_dict = training_data['results']
    versions = training_data['versions']
    
    # Extract the actual model results and evaluation
    model_results = result_dict.get('results', {})  # dict of {model_name: model_info}
    evaluation = result_dict.get('evaluation', {})  # dict of {model_name: metrics}
    
    # Build comparison table from evaluation results - only include key metrics
    KEY_METRICS = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'training_time', 'cv_mean']
    
    comparison_data = []
    for model_name, metrics in evaluation.items():
        # Convert numpy types to serializable types
        clean_metrics = _convert_to_serializable(metrics)
        
        # Build row with only key metrics
        row = {'Model': model_name}
        for metric in KEY_METRICS:
            if metric in clean_metrics:
                row[metric] = clean_metrics[metric]
        
        # Add best_params as metadata (will display separately)
        row['best_params'] = _format_best_params(clean_metrics.get('best_params'))
        
        comparison_data.append(row)
    
    comparison_df = pd.DataFrame(comparison_data)
    
    # Get comparison table (for display, exclude best_params)
    try:
        if not comparison_df.empty:
            display_df = comparison_df.drop(columns=['best_params'])
            comparison = show_comparison_table(display_df.to_dict('records'))
        else:
            comparison = pd.DataFrame()
    except Exception as e:
        logger.warning(f"Failed to generate comparison table: {e}")
        comparison = pd.DataFrame()

    # Get ranking by accuracy (or first available metric)
    ranking_metric = 'accuracy'  # Default to accuracy
    try:
        if not comparison_df.empty:
            # Check if accuracy exists, otherwise use f1_score
            if 'accuracy' not in comparison_df.columns:
                if 'f1_score' in comparison_df.columns:
                    ranking_metric = 'f1_score'
                else:
                    # Find first numeric column
                    numeric_cols = comparison_df.select_dtypes(include=['number']).columns
                    if len(numeric_cols) > 0:
                        ranking_metric = numeric_cols[0]
            
            # Create ranking with just Model and Score
            if ranking_metric in comparison_df.columns:
                ranked_df = comparison_df[['Model', ranking_metric]].copy()
                ranked_df = ranked_df.sort_values(by=ranking_metric, ascending=False).reset_index(drop=True)
                ranked_df['Rank'] = range(1, len(ranked_df) + 1)
                ranked_df = ranked_df[['Rank', 'Model', ranking_metric]]
                ranked_df = ranked_df.rename(columns={ranking_metric: 'Score'})
                ranked = ranked_df
            else:
                ranked = pd.DataFrame()
        else:
            ranked = pd.DataFrame()
    except Exception as e:
        logger.warning(f"Failed to rank algorithms: {e}")
        ranked = pd.DataFrame()

    # Normalize outputs to list of dicts
    try:
        comparison_out = comparison.to_dict('records') if hasattr(comparison, 'to_dict') else comparison
    except Exception:
        comparison_out = []

    try:
        ranked_out = ranked.to_dict('records') if hasattr(ranked, 'to_dict') else ranked
    except Exception:
        ranked_out = ranked if isinstance(ranked, list) else []

    # Convert any remaining numpy types to serializable types
    comparison_out = _convert_to_serializable(comparison_out)
    ranked_out = _convert_to_serializable(ranked_out)
    
    # Create detailed metrics for optional display
    detailed_metrics = []
    for model_name, metrics in evaluation.items():
        clean_metrics = _convert_to_serializable(metrics)
        detailed_metrics.append({
            'model': model_name,
            'accuracy': clean_metrics.get('accuracy'),
            'precision': clean_metrics.get('precision'),
            'recall': clean_metrics.get('recall'),
            'f1_score': clean_metrics.get('f1_score'),
            'roc_auc': clean_metrics.get('roc_auc'),
            'training_time': clean_metrics.get('training_time'),
            'cv_mean': clean_metrics.get('cv_mean'),
            'cv_std': clean_metrics.get('cv_std'),
            'best_params': _format_best_params(clean_metrics.get('best_params'))
        })
    
    # Auto-select best 3 models with detailed reasoning
    best_3_models = _select_best_models(evaluation, detailed_metrics)

    return {
        'status': 'done',
        'comparison': comparison_out,
        'ranked': ranked_out,
        'versions': versions,
        'detailed_metrics': detailed_metrics,
        'best_3_models': best_3_models
    }


def _select_best_models(evaluation: Dict[str, Dict[str, Any]], detailed_metrics: list) -> list:
    """Select best 3 models with detailed reasoning."""
    if not detailed_metrics:
        return []
    
    # Score each model based on multiple criteria
    scored_models = []
    for metrics in detailed_metrics:
        model_name = metrics['model']
        
        # Calculate composite score (weighted average of key metrics)
        accuracy = metrics.get('accuracy') or 0
        f1 = metrics.get('f1_score') or 0
        roc_auc = metrics.get('roc_auc') or 0
        cv_mean = metrics.get('cv_mean') or 0
        
        # Weighted score: prioritize accuracy and generalization
        composite_score = (accuracy * 0.35) + (f1 * 0.25) + (roc_auc * 0.25) + (cv_mean * 0.15)
        
        # Build detailed reasoning
        reasons = []
        
        if accuracy and accuracy >= 0.9:
            reasons.append(f"High accuracy ({accuracy:.1%})")
        if f1 and f1 >= 0.9:
            reasons.append(f"Excellent F1-score ({f1:.4f})")
        if roc_auc and roc_auc >= 0.95:
            reasons.append(f"Outstanding ROC-AUC ({roc_auc:.4f})")
        if cv_mean and cv_mean >= 0.92:
            reasons.append(f"Strong cross-validation stability ({cv_mean:.4f})")
        
        training_time = metrics.get('training_time') or 0
        if training_time and training_time < 5:
            reasons.append(f"Fast training ({training_time:.2f}s)")
        
        if not reasons:
            reasons.append("Balanced performance across metrics")
        
        scored_models.append({
            'model': model_name,
            'composite_score': composite_score,
            'accuracy': accuracy,
            'f1_score': f1,
            'roc_auc': roc_auc,
            'cv_mean': cv_mean,
            'training_time': training_time,
            'best_params': metrics.get('best_params'),
            'reasons': reasons,
            'rank_medal': None
        })
    
    # Sort by composite score
    scored_models.sort(key=lambda x: x['composite_score'], reverse=True)
    
    # Add medals and limit to top 3
    medals = ['🥇 Best Model', '🥈 Second Best', '🥉 Third Best']
    for i, model in enumerate(scored_models[:3]):
        model['rank_medal'] = medals[i]
    
    return scored_models[:3]
