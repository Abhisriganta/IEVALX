

import React from 'react';
import {
  Grid, Box, Stack, Typography, FormControlLabel, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
} from '@mui/material';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import RemoveOutlined from '@mui/icons-material/RemoveOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

import {
  SectionCard, EmptyState, FormDialog, ConfirmDialog,
  SelectInput, TextInput,
} from '../parts';

import useProfileListEditor from '@/hooks/jobseeker/useProfileListEditor';

import {
  LANGUAGE_PROFICIENCY,
  MAX_LANGUAGE_NAME,
  PALETTE,
  FONTS,
} from '@/constants/profileConstants';

const ABILITIES = [
  { key: 'can_read',  label: 'Read'  },
  { key: 'can_write', label: 'Write' },
  { key: 'can_speak', label: 'Speak' },
];

// Handles both shapes: an `abilities` label array, or flat can_* booleans.
function hasAbility(language, key, label) {
  if (Array.isArray(language.abilities)) return language.abilities.includes(label);
  return Boolean(language[key]);
}

const CHARCOAL = PALETTE.charcoal || '#273238';
const SAGE     = PALETTE.sage     || '#7F9E7E';

const HEAD_SX = {
  fontFamily: FONTS.body, fontSize: '0.75rem', fontWeight: 600,
  color: PALETTE.muted, py: 1.25, borderColor: PALETTE.border,
  whiteSpace: 'nowrap', letterSpacing: '0.02em',
};
const CELL_SX = {
  fontFamily: FONTS.body, fontSize: '0.875rem',
  color: CHARCOAL, py: 1.25, borderColor: PALETTE.border,
};

export default function LanguagesSection({ candidateId, languages = [], loading, onRefresh }) {
  const editor = useProfileListEditor({
    kind: 'languages', candidateId, items: languages, onSaved: onRefresh,
  });

  const { form, fieldErrors: err, setField } = editor;
  const noAbility = !form.can_read && !form.can_write && !form.can_speak;

  return (
    <>
      <SectionCard
        id="languages"
        title="Languages"
        description="Which languages you work in, and what you can do in each."
        complete={languages.length > 0}
        loading={loading}
        onAdd={editor.atLimit ? undefined : editor.openCreate}
        addLabel="Add language"
        addFilled
      >
        {editor.sorted.length === 0 ? (
          <EmptyState
            message="No languages yet. Worth adding if you work across regions or with clients."
          />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table
              size="small"
              sx={{
                minWidth: 520,
                '& .MuiTableCell-root': { borderColor: PALETTE.border },
                '& tbody tr:last-child .MuiTableCell-root': { borderBottom: 0 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={HEAD_SX}>Language</TableCell>
                  <TableCell sx={HEAD_SX}>Proficiency</TableCell>
                  {ABILITIES.map((a) => (
                    <TableCell key={a.key} align="center" sx={HEAD_SX}>{a.label}</TableCell>
                  ))}
                  <TableCell align="right" sx={HEAD_SX} />
                </TableRow>
              </TableHead>
              <TableBody>
                {editor.sorted.map((language) => (
                  <TableRow key={language.language_id} hover>
                    <TableCell sx={{ ...CELL_SX, fontWeight: 500 }}>
                      {language.language_name}
                    </TableCell>
                    <TableCell sx={{ ...CELL_SX, color: PALETTE.muted }}>
                      {language.proficiency}
                    </TableCell>
                    {ABILITIES.map((a) => (
                      <TableCell key={a.key} align="center" sx={CELL_SX}>
                        {hasAbility(language, a.key, a.label) ? (
                          <CheckOutlined sx={{ fontSize: 18, color: SAGE }} />
                        ) : (
                          <RemoveOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
                        )}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ ...CELL_SX, whiteSpace: 'nowrap' }}>
                      <IconButton
                        size="small"
                        onClick={() => editor.openEdit(language)}
                        aria-label={`Edit ${language.language_name}`}
                      >
                        <EditOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => editor.setPendingDelete(language)}
                        aria-label={`Delete ${language.language_name}`}
                      >
                        <DeleteOutlineOutlined sx={{ fontSize: 18, color: PALETTE.muted }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      <FormDialog
        open={editor.open}
        onClose={editor.close}
        title={editor.isEditing ? `Edit ${form.language_name || 'language'}` : 'Add language'}
        onSubmit={editor.save}
        submitLabel={editor.isEditing ? 'Save changes' : 'Add language'}
        saving={editor.saving}
        formError={editor.formError}
        submitColor={SAGE}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextInput
              label="Language"
              value={form.language_name}
              onChange={(v) => setField('language_name', v)}
              error={err.language_name}
              required
              placeholder="Telugu"
              maxLength={MAX_LANGUAGE_NAME}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <SelectInput
              label="Proficiency"
              value={form.proficiency}
              onChange={(v) => setField('proficiency', v)}
              options={LANGUAGE_PROFICIENCY}
              error={err.proficiency}
              required
              placeholder="Select level"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography
             sx={{ fontFamily: FONTS.body, fontSize: '0.8125rem', color: PALETTE.navy, mb: 0.5 }}
            >
              What can you do in this language?
            </Typography>
            <Stack direction="row" gap={2} sx={{ flexWrap: 'wrap' }}>
              {ABILITIES.map((ability) => (
                <FormControlLabel
                  key={ability.key}
                  control={
                    <Checkbox
                      checked={Boolean(form[ability.key])}
                      onChange={(e) => setField(ability.key, e.target.checked)}
                      size="small"
                     sx={{
                        color: PALETTE.border,
                        '&.Mui-checked': { color: PALETTE.accent } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.875rem' }}>
                      {ability.label}
                    </Typography>
                  }
                />
              ))}
            </Stack>
            {(err.can_read || noAbility) && (
              <Typography
               sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.75rem',
                  color: err.can_read ? PALETTE.danger : PALETTE.muted,
                  mt: 0.5 }}
              >
                {err.can_read || 'Choose at least one.'}
              </Typography>
            )}
          </Grid>
        </Grid>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(editor.pendingDelete)}
        onClose={() => editor.setPendingDelete(null)}
        onConfirm={editor.confirmDelete}
        busy={editor.deleting}
        title={`Remove ${editor.pendingDelete?.language_name || 'this language'}?`}
        message="This removes it from your profile. You can add it again at any time."
        confirmLabel="Remove"
      />
    </>
  );
}