import pandas as pd
import numpy as np
import gc
import xgboost as xgb
from sklearn.model_selection import train_test_split
from scipy.stats import kurtosis
import os
import json

def factorize_obj(df):
    for col in df.select_dtypes(include=['object', 'string']).columns:
        df[col] = df[col].astype('category').cat.codes
    return df

def aggregate(df, group_col):
    df = factorize_obj(df)
    aggs = ['mean', 'std', 'min', 'max', 'sum', 'nunique']
    grouped = df.groupby(group_col).agg(aggs)
    grouped.columns = ['_'.join(col).strip() for col in grouped.columns.values]
    return grouped

def main():
    if not os.path.exists('input'):
        print("Input directory not found.")
        return

    # bbalance
    print("Processing bureau_balance...")
    bbalance = pd.read_csv("input/bureau_balance.csv")
    sum_bbalance = aggregate(bbalance, 'SK_ID_BUREAU')
    del bbalance; gc.collect()

    # bureau
    print("Processing bureau...")
    bureau = pd.read_csv("input/bureau.csv")
    bureau = bureau.join(sum_bbalance, on='SK_ID_BUREAU', rsuffix='_bal')
    bureau.drop(columns=['SK_ID_BUREAU'], inplace=True, errors='ignore')
    sum_bureau = aggregate(bureau, 'SK_ID_CURR')
    del bureau, sum_bbalance; gc.collect()

    # cc_balance
    print("Processing credit_card_balance...")
    cc_balance = pd.read_csv("input/credit_card_balance.csv")
    cc_balance.drop(columns=['SK_ID_PREV'], inplace=True, errors='ignore')
    sum_cc_balance = aggregate(cc_balance, 'SK_ID_CURR')
    del cc_balance; gc.collect()

    # payments
    print("Processing installments_payments...")
    payments = pd.read_csv("input/installments_payments.csv")
    payments.drop(columns=['SK_ID_PREV'], inplace=True, errors='ignore')
    payments['PAYMENT_PERC'] = payments['AMT_PAYMENT'] / payments['AMT_INSTALMENT']
    payments['PAYMENT_DIFF'] = payments['AMT_INSTALMENT'] - payments['AMT_PAYMENT']
    payments['DPD'] = payments['DAYS_ENTRY_PAYMENT'] - payments['DAYS_INSTALMENT']
    payments['DBD'] = payments['DAYS_INSTALMENT'] - payments['DAYS_ENTRY_PAYMENT']
    payments['DPD'] = payments['DPD'].apply(lambda x: x if x > 0 else 0)
    payments['DBD'] = payments['DBD'].apply(lambda x: x if x > 0 else 0)
    sum_payments = aggregate(payments, 'SK_ID_CURR')
    del payments; gc.collect()

    # pc_balance
    print("Processing POS_CASH_balance...")
    pc_balance = pd.read_csv("input/POS_CASH_balance.csv")
    pc_balance.drop(columns=['SK_ID_PREV'], inplace=True, errors='ignore')
    sum_pc_balance = aggregate(pc_balance, 'SK_ID_CURR')
    del pc_balance; gc.collect()

    # prev
    print("Processing previous_application...")
    prev = pd.read_csv("input/previous_application.csv")
    prev.drop(columns=['SK_ID_PREV'], inplace=True, errors='ignore')
    for col in ['DAYS_FIRST_DRAWING', 'DAYS_FIRST_DUE', 'DAYS_LAST_DUE_1ST_VERSION', 'DAYS_LAST_DUE', 'DAYS_TERMINATION']:
        if col in prev.columns:
            prev[col] = prev[col].replace(365243, np.nan)
    prev['APP_CREDIT_PERC'] = prev['AMT_APPLICATION'] / prev['AMT_CREDIT']
    sum_prev = aggregate(prev, 'SK_ID_CURR')
    del prev; gc.collect()

    # tr and te
    print("Processing application train and test...")
    tr = pd.read_csv("input/application_train.csv")
    te = pd.read_csv("input/application_test.csv")

    y = tr['TARGET']
    tr.drop(columns=['TARGET'], inplace=True, errors='ignore')
    tr_te = pd.concat([tr, te], ignore_index=True)

    print("Joining features...")
    tr_te = tr_te.join(sum_bureau, on='SK_ID_CURR', rsuffix='_bureau')
    tr_te = tr_te.join(sum_cc_balance, on='SK_ID_CURR', rsuffix='_cc_bal')
    tr_te = tr_te.join(sum_payments, on='SK_ID_CURR', rsuffix='_pmts')
    tr_te = tr_te.join(sum_pc_balance, on='SK_ID_CURR', rsuffix='_pc_bal')
    tr_te = tr_te.join(sum_prev, on='SK_ID_CURR', rsuffix='_prev')

    sk_id_curr = tr_te['SK_ID_CURR']
    tr_te.drop(columns=['SK_ID_CURR'], inplace=True)
    tr_te = factorize_obj(tr_te)

    print("Calculating custom features...")
    tr_te['na'] = tr_te.isnull().sum(axis=1)
    tr_te['DAYS_EMPLOYED'] = tr_te['DAYS_EMPLOYED'].replace(365243, np.nan)
    tr_te['DAYS_EMPLOYED_PERC'] = np.sqrt(tr_te['DAYS_EMPLOYED'] / tr_te['DAYS_BIRTH'].replace(0, np.nan))
    tr_te['INCOME_CREDIT_PERC'] = tr_te['AMT_INCOME_TOTAL'] / tr_te['AMT_CREDIT']
    tr_te['INCOME_PER_PERSON'] = np.log1p(tr_te['AMT_INCOME_TOTAL'] / tr_te['CNT_FAM_MEMBERS'])
    tr_te['ANNUITY_INCOME_PERC'] = np.sqrt(tr_te['AMT_ANNUITY'] / (1 + tr_te['AMT_INCOME_TOTAL']))
    tr_te['LOAN_INCOME_RATIO'] = tr_te['AMT_CREDIT'] / tr_te['AMT_INCOME_TOTAL']
    tr_te['ANNUITY_LENGTH'] = tr_te['AMT_CREDIT'] / tr_te['AMT_ANNUITY']
    tr_te['CHILDREN_RATIO'] = tr_te['CNT_CHILDREN'] / tr_te['CNT_FAM_MEMBERS']
    tr_te['CREDIT_TO_GOODS_RATIO'] = tr_te['AMT_CREDIT'] / tr_te['AMT_GOODS_PRICE']
    tr_te['INC_PER_CHLD'] = tr_te['AMT_INCOME_TOTAL'] / (1 + tr_te['CNT_CHILDREN'])
    tr_te['SOURCES_PROD'] = tr_te['EXT_SOURCE_1'] * tr_te['EXT_SOURCE_2'] * tr_te['EXT_SOURCE_3']
    tr_te['CAR_TO_BIRTH_RATIO'] = tr_te['OWN_CAR_AGE'] / tr_te['DAYS_BIRTH']
    tr_te['CAR_TO_EMPLOY_RATIO'] = tr_te['OWN_CAR_AGE'] / tr_te['DAYS_EMPLOYED']
    tr_te['PHONE_TO_BIRTH_RATIO'] = tr_te['DAYS_LAST_PHONE_CHANGE'] / tr_te['DAYS_BIRTH']
    tr_te['PHONE_TO_EMPLOY_RATIO'] = tr_te['DAYS_LAST_PHONE_CHANGE'] / tr_te['DAYS_EMPLOYED']

    docs = [c for c in tr_te.columns if 'FLAG_DOC' in c]
    live = [c for c in tr_te.columns if 'FLAG_' in c and 'NFLAG_' not in c and 'FLAG_DOC' not in c and '_FLAG_' not in c]

    inc_by_org = tr_te.groupby('ORGANIZATION_TYPE')['AMT_INCOME_TOTAL'].median().to_dict()

    tr_te['DOC_IND_KURT'] = tr_te[docs].apply(kurtosis, axis=1)
    tr_te['LIVE_IND_SUM'] = tr_te[live].sum(axis=1)
    tr_te['NEW_INC_BY_ORG'] = tr_te['ORGANIZATION_TYPE'].map(inc_by_org)
    tr_te['NEW_EXT_SOURCES_MEAN'] = tr_te[['EXT_SOURCE_1', 'EXT_SOURCE_2', 'EXT_SOURCE_3']].mean(axis=1)
    tr_te['NEW_SCORES_STD'] = tr_te[['EXT_SOURCE_1', 'EXT_SOURCE_2', 'EXT_SOURCE_3']].std(axis=1)

    tr_te.replace([np.inf, -np.inf], np.nan, inplace=True)
    
    # Save precomputed features
    tr_te['SK_ID_CURR'] = sk_id_curr
    print("Saving precomputed features...")
    # Convert types to standard float32 to save memory
    for col in tr_te.columns:
        if tr_te[col].dtype == 'float64':
            tr_te[col] = tr_te[col].astype('float32')
            
    tr_te.to_pickle("input/precomputed_features.pkl")

    print("Preparing data for training...")
    tri = len(tr)
    X = tr_te.iloc[:tri].drop(columns=['SK_ID_CURR'])

    # Ensure numeric
    X = X.astype(float)
    
    with open('app/xgb_features.json', 'w') as f:
        json.dump(list(X.columns), f)

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, random_state=0)

    dtrain = xgb.DMatrix(X_train, label=y_train)
    dval = xgb.DMatrix(X_val, label=y_val)

    params = {
        'objective': 'binary:logistic',
        'booster': 'gbtree',
        'eval_metric': 'auc',
        'nthread': 4,
        'eta': 0.05,
        'max_depth': 6,
        'min_child_weight': 30,
        'gamma': 0,
        'subsample': 0.85,
        'colsample_bytree': 0.7,
        'colsample_bylevel': 0.632,
        'alpha': 0,
        'lambda': 0
    }

    print("Training model...")
    evals = [(dtrain, 'train'), (dval, 'val')]
    m_xgb = xgb.train(params, dtrain, num_boost_round=100, evals=evals, early_stopping_rounds=10, verbose_eval=10)
    # Note: Reduced nrounds to 100 for time constraints, since 2000 would take ~1 hour locally.

    print("Saving model...")
    m_xgb.save_model("app/xgb_model.json")
    print("Done!")

if __name__ == "__main__":
    main()
