import React from 'react';
import { DataFrame, getFieldDisplayName, GrafanaTheme2, ReducerID, SelectableValue } from '@grafana/data';
import { Select, StatsPicker, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import {
  configMapHandlers,
  FieldToConfigMapping,
  lookUpConfigHandler,
} from '../fieldToConfigMapping/fieldToConfigMapping';
import { capitalize } from 'lodash';

interface Props {
  frame: DataFrame;
  mappings: FieldToConfigMapping[];
  onChange: (mappings: FieldToConfigMapping[]) => void;
  withReducers?: boolean;
}

export function FieldToConfigMappingEditor({ frame, mappings, onChange, withReducers }: Props) {
  const styles = useStyles2(getStyles);
  const rows = getViewModelRows(frame, mappings);
  const configProps: Array<SelectableValue<string | undefined>> = configMapHandlers.map((def) => ({
    label: capitalize(def.key),
    value: def.key,
  }));

  const onChangeConfigProperty = (row: FieldToConfigRowViewModel, value: SelectableValue<string | undefined>) => {
    const existingIdx = mappings.findIndex((x) => x.fieldName === row.fieldName);

    if (value) {
      if (existingIdx !== -1) {
        const update = [...mappings];
        update.splice(existingIdx, 1, { ...mappings[existingIdx], configProperty: value.value! });
        onChange(update);
      } else {
        onChange([...mappings, { fieldName: row.fieldName, configProperty: value.value! }]);
      }
    } else {
      if (existingIdx !== -1) {
        onChange(mappings.filter((x, index) => index !== existingIdx));
      } else {
        // mark it as ignored
        onChange([...mappings, { fieldName: row.fieldName, configProperty: null }]);
      }
    }
  };

  const onChangeReducer = (row: FieldToConfigRowViewModel, reducerId: ReducerID) => {
    const existingIdx = mappings.findIndex((x) => x.fieldName === row.fieldName);

    if (existingIdx !== -1) {
      const update = [...mappings];
      update.splice(existingIdx, 1, { ...mappings[existingIdx], reducerId });
      onChange(update);
    } else {
      onChange([...mappings, { fieldName: row.fieldName, configProperty: row.configHandlerKey, reducerId }]);
    }
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Field name</th>
          <th>Maps to config</th>
          {withReducers && <th>Reducer</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.fieldName}>
            <td className={styles.labelCell}>{row.fieldName}</td>
            <td className={styles.selectCell}>
              <Select
                options={configProps}
                value={row.configHandlerKey}
                isClearable={true}
                onChange={(value) => onChangeConfigProperty(row, value)}
              />
            </td>
            {withReducers && (
              <td>
                <StatsPicker
                  stats={[row.reducerId]}
                  onChange={(stats: string[]) => onChangeReducer(row, stats[0] as ReducerID)}
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface FieldToConfigRowViewModel {
  configHandlerKey: string | null;
  fieldName: string;
  isAutomatic: boolean;
  missingInFrame?: boolean;
  reducerId: string;
}

function getViewModelRows(frame: DataFrame, mappings: FieldToConfigMapping[]): FieldToConfigRowViewModel[] {
  const rows: Record<string, FieldToConfigRowViewModel> = {};

  for (const field of frame.fields) {
    const fieldName = getFieldDisplayName(field, frame);
    const mapping = mappings.find((x) => x.fieldName === fieldName);
    const key = mapping ? mapping.configProperty : fieldName.toLowerCase();
    const handler = lookUpConfigHandler(key);

    rows[fieldName] = {
      fieldName,
      isAutomatic: mapping !== null,
      configHandlerKey: handler?.key ?? null,
      reducerId: mapping?.reducerId ?? ReducerID.lastNotNull,
    };
  }

  // Add rows for mappings that have no matching field
  for (const mapping of mappings) {
    if (!rows[mapping.fieldName]) {
      rows[mapping.fieldName] = {
        fieldName: mapping.fieldName,
        configHandlerKey: mapping.configProperty,
        isAutomatic: false,
        missingInFrame: true,
        reducerId: mapping.reducerId ?? ReducerID.lastNotNull,
      };
    }
  }

  return Object.values(rows);
}

const getStyles = (theme: GrafanaTheme2) => ({
  mappings: css`
    flex-grow: 1;
  `,
  table: css`
    td,
    th {
      border-right: 4px solid ${theme.colors.background.primary};
      border-bottom: 4px solid ${theme.colors.background.primary};
      white-space: nowrap;
      min-width: 158px;
    }
    th {
      background: ${theme.colors.background.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      line-height: ${theme.spacing(4)};
      padding: ${theme.spacing(0, 1)};
    }
  `,
  labelCell: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    background: ${theme.colors.background.secondary};
    padding: ${theme.spacing(0, 1)};
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  selectCell: css`
    padding: 0;
  `,
});