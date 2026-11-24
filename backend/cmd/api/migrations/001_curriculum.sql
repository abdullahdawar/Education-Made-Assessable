CREATE TABLE IF NOT EXISTS v2_grades (
  id INT PRIMARY KEY,
  label_en VARCHAR(50) NOT NULL,
  label_ps VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS v2_subjects (
  slug VARCHAR(64) PRIMARY KEY,
  label_en VARCHAR(100) NOT NULL,
  label_ps VARCHAR(100) NOT NULL,
  description_en VARCHAR(255) NOT NULL,
  description_ps VARCHAR(255) NOT NULL,
  framework VARCHAR(200) NOT NULL,
  minimum_grade INT NOT NULL
);
CREATE TABLE IF NOT EXISTS v2_courses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  grade INT NOT NULL,
  subject VARCHAR(64) NOT NULL,
  UNIQUE (grade, subject),
  FOREIGN KEY (grade) REFERENCES v2_grades(id),
  FOREIGN KEY (subject) REFERENCES v2_subjects(slug)
);
CREATE TABLE IF NOT EXISTS v2_units (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT NOT NULL,
  slug VARCHAR(64) NOT NULL,
  position INT NOT NULL CHECK (position > 0),
  state VARCHAR(16) NOT NULL CHECK (state IN ('draft','published','archived')),
  payload JSON NOT NULL,
  UNIQUE (course_id, slug),
  UNIQUE (course_id, position),
  FOREIGN KEY (course_id) REFERENCES v2_courses(id)
);
INSERT IGNORE INTO v2_grades VALUES
  (1,'Grade 1','لومړی ټولګی'), (2,'Grade 2','دوهم ټولګی'),
  (3,'Grade 3','درېیم ټولګی'), (4,'Grade 4','څلورم ټولګی'),
  (5,'Grade 5','پنځم ټولګی'), (6,'Grade 6','شپږم ټولګی');
INSERT IGNORE INTO v2_subjects VALUES
  ('mathematics','Mathematics','ریاضي','Explore numbers, shapes and patterns.','شمېرې، شکلونه او نمونې وپېژنئ.','Cambridge Primary Mathematics 0096',1),
  ('english','English','انګلیسي','Read, write, listen and speak in English.','په انګلیسي ولولئ، ولیکئ، واورئ او خبرې وکړئ.','Cambridge Primary English 0058',1),
  ('science','Science','ساینس','Observe and investigate the world around you.','خپل شاوخوا نړۍ وڅېړئ.','Cambridge Primary Science 0097',1),
  ('urdu','Urdu','اردو','Practise reading, writing and speaking Urdu.','د اردو لوستل، لیکل او خبرې تمرین کړئ.','Pakistan National Curriculum Urdu',1),
  ('pakistan-studies','Pakistan Studies','پاکستان پېژندنه','Explore communities, places and history.','ټولنې، ځایونه او تاریخ وپېژنئ.','Pakistan National Curriculum primary citizenship and social studies pathway',1),
  ('islamiyat','Islamiyat','اسلامیات','Learn about Islamic beliefs and practices.','اسلامي عقاید او عملونه زده کړئ.','Pakistan National Curriculum Islamiyat',1),
  ('computer-science','Computer Science','کمپیوټر ساینس','Explore computing and problem solving.','کمپیوټر او د ستونزو حل وپېژنئ.','Cambridge Primary Computing 0059',4);
INSERT IGNORE INTO v2_courses (grade, subject)
  SELECT g.id, s.slug FROM v2_grades g CROSS JOIN v2_subjects s
  WHERE g.id >= s.minimum_grade ORDER BY g.id, s.slug;
